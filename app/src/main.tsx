import React from "react";
import ReactDOM from "react-dom/client";
import { HashRouter } from "react-router-dom";
import { App } from "./App";
import { SupabaseAuthBootstrap } from "./backend/SupabaseAuthBootstrap";
import { TutorialProvider } from "./features/tutorial/TutorialProvider";
import "./i18n";
import "./styles.css";

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
	<React.StrictMode>
		<HashRouter>
			<SupabaseAuthBootstrap />
			<TutorialProvider>
				<App />
			</TutorialProvider>
		</HashRouter>
	</React.StrictMode>
);
