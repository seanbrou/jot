import { Toaster as Sonner } from "sonner";

export function Toaster() {
  return (
    <Sonner
      richColors
      position="top-right"
      toastOptions={{
        style: {
          background: "#ffffff",
          color: "#2d2a27",
          border: "1px solid #e8e2dc",
        },
      }}
    />
  );
}
