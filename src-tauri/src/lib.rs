use dotenvy::dotenv;
use reqwest::header::{AUTHORIZATION, CONTENT_TYPE};
use serde::{Deserialize, Serialize};
use serde_json::json;
use std::sync::atomic::{AtomicBool, Ordering};
use tauri::{
    menu::MenuEvent,
    menu::{MenuBuilder, MenuItemBuilder},
    tray::{MouseButton, MouseButtonState, TrayIcon, TrayIconBuilder, TrayIconEvent},
    AppHandle, Emitter, Manager, PhysicalPosition, PhysicalSize, WebviewWindow, WindowEvent,
};
use tauri_plugin_global_shortcut::{GlobalShortcutExt, ShortcutState};

const CAPTURE_WINDOW_LABEL: &str = "capture";
const MAIN_WINDOW_LABEL: &str = "main";
const TRAY_OPEN_ID: &str = "open";
const TRAY_QUIT_ID: &str = "quit";
const QUICK_CAPTURE_SHORTCUT: &str = "Alt+N";
const CAPTURE_WIDTH: i32 = 440;
const CAPTURE_HEIGHT: i32 = 80;
const CAPTURE_MARGIN: i32 = 16;
const CAPTURE_OFFSET: i32 = 18;

#[derive(Default)]
struct AppState {
    quitting: AtomicBool,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct CandidateNotebook {
    id: String,
    name: String,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct ClassifyNoteRequest {
    note_id: String,
    body: String,
    candidate_notebooks: Vec<CandidateNotebook>,
    inbox_notebook_id: String,
}

#[derive(Debug, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
struct ClassifyNoteResponse {
    notebook_id: Option<String>,
    confidence: f64,
    reasoning: String,
    suggested_title: Option<String>,
}

#[derive(Debug, Deserialize)]
struct ChatCompletionResponse {
    choices: Vec<ChatChoice>,
}

#[derive(Debug, Deserialize)]
struct ChatChoice {
    message: ChatMessage,
}

#[derive(Debug, Deserialize)]
struct ChatMessage {
    content: Option<String>,
}

fn load_runtime_env(app: &AppHandle) {
    let _ = dotenv();

    if let Some(config_dir) = app.path().app_config_dir().ok() {
        let config_file = config_dir.join("classifier.env");
        if config_file.exists() {
            let _ = dotenvy::from_path(config_file);
        }
    }
}

fn get_classifier_model() -> String {
    std::env::var("OAT_CLASSIFIER_MODEL").unwrap_or_else(|_| "openai/gpt-oss-20b".to_string())
}

fn clamp(value: i32, min: i32, max: i32) -> i32 {
    value.max(min).min(max)
}

fn get_window(handle: &AppHandle, label: &str) -> Result<WebviewWindow, String> {
    handle
        .get_webview_window(label)
        .ok_or_else(|| format!("The {label} window is not available."))
}

fn show_main_window(handle: &AppHandle) -> Result<(), String> {
    let window = get_window(handle, MAIN_WINDOW_LABEL)?;
    let _ = window.unminimize();
    let _ = window.show();
    let _ = window.set_focus();
    Ok(())
}

fn show_capture_window(handle: &AppHandle) -> Result<(), String> {
    let window = get_window(handle, CAPTURE_WINDOW_LABEL)?;
    let _ = window.unminimize();

    let cursor = handle
        .cursor_position()
        .map_err(|error| format!("Could not read the cursor position: {error}"))?;

    let mut x = cursor.x as i32 + CAPTURE_OFFSET;
    let mut y = cursor.y as i32 + CAPTURE_OFFSET;

    if let Some(monitor) = handle
        .monitor_from_point(cursor.x, cursor.y)
        .map_err(|error| format!("Could not resolve the active monitor: {error}"))?
    {
        let work_area = monitor.work_area();
        let min_x = work_area.position.x + CAPTURE_MARGIN;
        let max_x = work_area.position.x + work_area.size.width as i32 - CAPTURE_WIDTH - CAPTURE_MARGIN;
        let min_y = work_area.position.y + CAPTURE_MARGIN;
        let max_y =
            work_area.position.y + work_area.size.height as i32 - CAPTURE_HEIGHT - CAPTURE_MARGIN;

        x = clamp(x, min_x, max_x);
        y = clamp(y, min_y, max_y);
    }

    let _ = window.set_size(PhysicalSize::new(CAPTURE_WIDTH, CAPTURE_HEIGHT));
    let _ = window.set_position(PhysicalPosition::new(x, y));
    let _ = window.set_always_on_top(true);
    let _ = window.show();
    let _ = window.set_focus();
    let _ = window.set_always_on_top(false);
    let _ = window.emit("oat://focus-capture", ());

    Ok(())
}

fn hide_window(handle: &AppHandle, label: &str) -> Result<(), String> {
    let window = get_window(handle, label)?;
    let _ = window.hide();
    Ok(())
}

fn handle_tray_action(app: &AppHandle, id: &str, state: &AppState) {
    match id {
        TRAY_OPEN_ID => {
            let _ = show_main_window(app);
        }
        TRAY_QUIT_ID => {
            state.quitting.store(true, Ordering::SeqCst);
            app.exit(0);
        }
        _ => {}
    }
}

fn build_tray(app: &AppHandle) -> tauri::Result<()> {
    let open_item = MenuItemBuilder::with_id(TRAY_OPEN_ID, "Open Oat").build(app)?;
    let quit_item = MenuItemBuilder::with_id(TRAY_QUIT_ID, "Quit").build(app)?;
    let menu = MenuBuilder::new(app)
        .item(&open_item)
        .separator()
        .item(&quit_item)
        .build()?;

    TrayIconBuilder::new()
        .menu(&menu)
        .show_menu_on_left_click(false)
        .on_menu_event(|app: &AppHandle, event: MenuEvent| {
            let state = app.state::<AppState>();
            handle_tray_action(app, event.id().as_ref(), &state);
        })
        .on_tray_icon_event(|tray: &TrayIcon, event: TrayIconEvent| {
            if matches!(
                event,
                TrayIconEvent::Click {
                    button: MouseButton::Left,
                    button_state: MouseButtonState::Up,
                    ..
                }
            ) {
                let _ = show_main_window(tray.app_handle());
            }
        })
        .icon(app.default_window_icon().cloned().expect("default icon should be available"))
        .build(app)?;

    Ok(())
}

#[tauri::command]
async fn classify_note_local(
    app: AppHandle,
    request: ClassifyNoteRequest,
) -> Result<ClassifyNoteResponse, String> {
    load_runtime_env(&app);

    let gateway_key = std::env::var("AI_GATEWAY_API_KEY")
        .map_err(|_| "AI_GATEWAY_API_KEY is missing. Add it to .env or classifier.env.".to_string())?;
    let model = get_classifier_model();

    let notebook_lines = request
        .candidate_notebooks
        .iter()
        .map(|notebook| format!("- {}: {}", notebook.id, notebook.name))
        .collect::<Vec<_>>()
        .join("\n");

    let schema = json!({
        "name": "oat_notebook_classification",
        "strict": true,
        "schema": {
            "type": "object",
            "properties": {
                "notebookId": {
                    "type": ["string", "null"],
                    "description": "A notebook id from the candidate list or null if Inbox is safer."
                },
                "confidence": {
                    "type": "number",
                    "minimum": 0.0,
                    "maximum": 1.0
                },
                "reasoning": {
                    "type": "string"
                },
                "suggestedTitle": {
                    "type": ["string", "null"]
                }
            },
            "required": ["notebookId", "confidence", "reasoning", "suggestedTitle"],
            "additionalProperties": false
        }
    });

    let body = json!({
        "model": model,
        "messages": [
            {
                "role": "system",
                "content": "You classify notes into existing notebooks. Only choose ids from the provided list. If the note does not clearly belong in an existing notebook, return notebookId as null. Confidence must be between 0 and 1. suggestedTitle should be short and natural."
            },
            {
                "role": "user",
                "content": format!(
                    "Note id: {}\nInbox notebook id: {}\n\nNote body:\n{}\n\nCandidate notebooks:\n{}\n\nReturn structured JSON only.",
                    request.note_id, request.inbox_notebook_id, request.body, notebook_lines
                )
            }
        ],
        "temperature": 0.1,
        "response_format": {
            "type": "json_schema",
            "json_schema": schema
        }
    });

    let client = reqwest::Client::new();
    let response = client
        .post("https://ai-gateway.vercel.sh/v1/chat/completions")
        .header(AUTHORIZATION, format!("Bearer {}", gateway_key))
        .header(CONTENT_TYPE, "application/json")
        .json(&body)
        .send()
        .await
        .map_err(|error| format!("Could not reach AI Gateway: {error}"))?;

    if !response.status().is_success() {
        let status = response.status();
        let text = response
            .text()
            .await
            .unwrap_or_else(|_| "Unknown gateway error".to_string());
        return Err(format!("AI Gateway returned {status}: {text}"));
    }

    let completion: ChatCompletionResponse = response
        .json()
        .await
        .map_err(|error| format!("Could not parse AI Gateway response: {error}"))?;

    let content = completion
        .choices
        .first()
        .and_then(|choice| choice.message.content.clone())
        .ok_or_else(|| "The model returned no classification content.".to_string())?;

    let parsed: ClassifyNoteResponse = serde_json::from_str(&content)
        .map_err(|error| format!("Could not parse model JSON: {error}. Raw output: {content}"))?;

    Ok(parsed)
}

#[tauri::command]
fn reveal_capture_window(app: AppHandle) -> Result<(), String> {
    show_capture_window(&app)
}

#[tauri::command]
fn hide_capture_window(app: AppHandle) -> Result<(), String> {
    hide_window(&app, CAPTURE_WINDOW_LABEL)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .manage(AppState::default())
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_global_shortcut::Builder::new().build())
        .plugin(tauri_plugin_positioner::init())
        .plugin(tauri_plugin_clipboard_manager::init())
        .plugin(tauri_plugin_sql::Builder::new().build())
        .setup(|app| {
            build_tray(app.handle())?;
            if let Err(error) = app
                .global_shortcut()
                .on_shortcut(QUICK_CAPTURE_SHORTCUT, |app, _shortcut, event| {
                    if event.state == ShortcutState::Pressed {
                        let _ = show_capture_window(app);
                    }
                })
            {
                eprintln!("Failed to register global shortcut {QUICK_CAPTURE_SHORTCUT}: {error}");
            }
            Ok(())
        })
        .on_window_event(|window, event| {
            if window.label() != MAIN_WINDOW_LABEL {
                return;
            }

            if let WindowEvent::CloseRequested { api, .. } = event {
                let state = window.state::<AppState>();
                if !state.quitting.load(Ordering::SeqCst) {
                    api.prevent_close();
                    let _ = window.hide();
                }
            }
        })
        .invoke_handler(tauri::generate_handler![
            classify_note_local,
            reveal_capture_window,
            hide_capture_window
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
