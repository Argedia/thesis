import { useState } from "react";
import { useTranslation } from "react-i18next";

export type DialogState =
  | null
  | {
      kind: "text";
      title: string;
      initialValue?: string;
      validate?: (value: string) => string | null;
      resolve: (value: string | null) => void;
    }
  | {
      kind: "alert";
      title: string;
      message: string;
      confirmLabel?: string;
      resolve: () => void;
    }
  | {
      kind: "level-complete";
      title: string;
      message: string;
      nextLevelId: string | null;
      resolve: (action: "next" | "levels") => void;
    }
  | {
      kind: "select";
      title: string;
      options: Array<{ value: string; label: string }>;
      initialValue?: string;
      resolve: (value: string | null) => void;
    }
  | {
      kind: "declaration";
      title: string;
      nameTitle: string;
      typeTitle: string;
      options: Array<{ value: string; label: string }>;
      initialName?: string;
      initialTypeValue?: string;
      resolve: (value: { name: string; typeValue: string } | null) => void;
    };

export interface DialogManager {
  dialogState: DialogState;
  dialogValue: string;
  dialogSecondaryValue: string;
  dialogError: string;
  dismissDialog: () => void;
  handleDialogSubmit: () => void;
  requestTextInput: (options: {
    title: string;
    initialValue?: string;
    validate?: (value: string) => string | null;
  }) => Promise<string | null>;
  requestSelectInput: (options: {
    title: string;
    initialValue?: string;
    options: Array<{ value: string; label: string }>;
  }) => Promise<string | null>;
  requestDeclarationInput: (options: {
    title: string;
    nameTitle: string;
    typeTitle: string;
    initialName?: string;
    initialTypeValue?: string;
    options: Array<{ value: string; label: string }>;
  }) => Promise<{ name: string; typeValue: string } | null>;
  showAlert: (options: { title?: string; message: string; confirmLabel?: string }) => Promise<void>;
  showLevelComplete: (options: { title: string; message: string; nextLevelId: string | null }) => Promise<"next" | "levels">;
  setDialogValue: (value: string) => void;
  setDialogSecondaryValue: (value: string) => void;
}

export const useDialogManager = (): DialogManager => {
  const { t } = useTranslation();
  const [dialogState, setDialogState] = useState<DialogState>(null);
  const [dialogValue, setDialogValue] = useState("");
  const [dialogSecondaryValue, setDialogSecondaryValue] = useState("");
  const [dialogError, setDialogError] = useState("");

  const closeDialog = () => {
    setDialogState(null);
    setDialogValue("");
    setDialogSecondaryValue("");
    setDialogError("");
  };

  const dismissDialog = () => {
    if (!dialogState) return;
    if (dialogState.kind === "alert") dialogState.resolve();
    else if (dialogState.kind === "level-complete") dialogState.resolve("levels");
    else dialogState.resolve(null);
    closeDialog();
  };

  const requestTextInput = (options: {
    title: string;
    initialValue?: string;
    validate?: (value: string) => string | null;
  }) =>
    new Promise<string | null>((resolve) => {
      setDialogValue(options.initialValue ?? "");
      setDialogError("");
      setDialogState({ kind: "text", ...options, resolve });
    });

  const requestSelectInput = (options: {
    title: string;
    initialValue?: string;
    options: Array<{ value: string; label: string }>;
  }) =>
    new Promise<string | null>((resolve) => {
      setDialogValue(options.initialValue ?? options.options[0]?.value ?? "");
      setDialogSecondaryValue("");
      setDialogError("");
      setDialogState({ kind: "select", ...options, resolve });
    });

  const requestDeclarationInput = (options: {
    title: string;
    nameTitle: string;
    typeTitle: string;
    initialName?: string;
    initialTypeValue?: string;
    options: Array<{ value: string; label: string }>;
  }) =>
    new Promise<{ name: string; typeValue: string } | null>((resolve) => {
      setDialogValue(options.initialName ?? "");
      setDialogSecondaryValue(options.initialTypeValue ?? options.options[0]?.value ?? "");
      setDialogError("");
      setDialogState({ kind: "declaration", ...options, resolve });
    });

  const showAlert = (options: { title?: string; message: string; confirmLabel?: string }) =>
    new Promise<void>((resolve) => {
      setDialogValue("");
      setDialogError("");
      setDialogState({
        kind: "alert",
        title: options.title ?? t("common.notice"),
        message: options.message,
        confirmLabel: options.confirmLabel,
        resolve
      });
    });

  const showLevelComplete = (options: { title: string; message: string; nextLevelId: string | null }) =>
    new Promise<"next" | "levels">((resolve) => {
      setDialogValue("");
      setDialogError("");
      setDialogState({ kind: "level-complete", ...options, resolve });
    });

  const handleDialogSubmit = () => {
    if (!dialogState) return;

    if (dialogState.kind === "alert") {
      dialogState.resolve();
      closeDialog();
      return;
    }

    if (dialogState.kind === "select") {
      if (!dialogValue) { setDialogError(t("messages.valueEmpty")); return; }
      dialogState.resolve(dialogValue);
      closeDialog();
      return;
    }

    if (dialogState.kind === "declaration") {
      if (!dialogValue.trim()) { setDialogError(t("messages.variableNameEmpty")); return; }
      if (!dialogSecondaryValue) { setDialogError(t("messages.valueEmpty")); return; }
      dialogState.resolve({ name: dialogValue.trim(), typeValue: dialogSecondaryValue });
      closeDialog();
      return;
    }

    if (dialogState.kind === "level-complete") {
      dialogState.resolve("levels");
      closeDialog();
      return;
    }

    const nextError = dialogState.validate?.(dialogValue) ?? null;
    if (nextError) { setDialogError(nextError); return; }
    dialogState.resolve(dialogValue);
    closeDialog();
  };

  return {
    dialogState,
    dialogValue,
    dialogSecondaryValue,
    dialogError,
    dismissDialog,
    handleDialogSubmit,
    requestTextInput,
    requestSelectInput,
    requestDeclarationInput,
    showAlert,
    showLevelComplete,
    setDialogValue,
    setDialogSecondaryValue
  };
};
