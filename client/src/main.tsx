import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { Switch, Route } from "wouter";
import "./index.css";
import { SWRConfig } from "swr";
import { fetcher } from "./lib/fetcher";
import { Editor } from "./pages/Editor";
import { Toaster } from "@/components/ui/toaster";
import { ThemeProvider } from "@/components/theme-provider";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ThemeProvider defaultTheme="system" storageKey="shortcut-genius-ui-theme">
      <SWRConfig value={{ fetcher }}>
        <Switch>
          <Route path="/" component={Editor} />
          <Route>404 Page Not Found</Route>
        </Switch>
        <Toaster />
      </SWRConfig>
    </ThemeProvider>
  </StrictMode>,
);
