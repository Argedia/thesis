import { Button, Input, Label, TextField } from "react-aria-components";
import { useTranslation } from "react-i18next";
import { AppDialog, AppModal } from "../../components/ui/AppOverlay";
import type { DialogManager } from "./useDialogManager";

interface AppDialogsProps {
  dialog: DialogManager;
}

export function AppDialogs({ dialog }: AppDialogsProps) {
  const { t } = useTranslation();
  const { dialogState, dialogValue, dialogSecondaryValue, dialogError, dismissDialog, handleDialogSubmit, setDialogValue, setDialogSecondaryValue } = dialog;

  return (
    <AppModal isOpen={dialogState !== null} onOpenChange={(isOpen) => !isOpen && dismissDialog()}>
      {dialogState?.kind === "text" ? (
        <AppDialog title={dialogState.title}>
          <TextField autoFocus className="app-text-dialog-field" value={dialogValue} onChange={setDialogValue}>
            <Label className="app-text-dialog-label">{dialogState.title}</Label>
            <Input className="app-text-dialog-input" />
          </TextField>
          {dialogError ? <p className="app-dialog-error">{dialogError}</p> : null}
          <div className="app-dialog-actions">
            <Button className="app-dialog-button secondary" onPress={dismissDialog}>{t("common.cancel")}</Button>
            <Button className="app-dialog-button" onPress={handleDialogSubmit}>{t("common.save")}</Button>
          </div>
        </AppDialog>
      ) : null}

      {dialogState?.kind === "alert" ? (
        <AppDialog title={dialogState.title}>
          <p className="app-dialog-message">{dialogState.message}</p>
          <div className="app-dialog-actions">
            <Button className="app-dialog-button" onPress={handleDialogSubmit}>{t("common.ok")}</Button>
          </div>
        </AppDialog>
      ) : null}

      {dialogState?.kind === "select" ? (
        <AppDialog title={dialogState.title}>
          <label className="app-text-dialog-label" htmlFor="app-select-dialog-input">{dialogState.title}</label>
          <select
            id="app-select-dialog-input"
            className="app-text-dialog-input"
            value={dialogValue}
            onChange={(e) => setDialogValue(e.target.value)}
            autoFocus
          >
            {dialogState.options.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
          {dialogError ? <p className="app-dialog-error">{dialogError}</p> : null}
          <div className="app-dialog-actions">
            <Button className="app-dialog-button secondary" onPress={dismissDialog}>{t("common.cancel")}</Button>
            <Button className="app-dialog-button" onPress={handleDialogSubmit}>{t("common.save")}</Button>
          </div>
        </AppDialog>
      ) : null}

      {dialogState?.kind === "declaration" ? (
        <AppDialog title={dialogState.title}>
          <label className="app-text-dialog-label" htmlFor="app-declaration-type-input">{dialogState.typeTitle}</label>
          <select
            id="app-declaration-type-input"
            className="app-text-dialog-input"
            value={dialogSecondaryValue}
            onChange={(e) => setDialogSecondaryValue(e.target.value)}
          >
            {dialogState.options.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
          <TextField autoFocus className="app-text-dialog-field" value={dialogValue} onChange={setDialogValue}>
            <Label className="app-text-dialog-label">{dialogState.nameTitle}</Label>
            <Input className="app-text-dialog-input" />
          </TextField>
          {dialogError ? <p className="app-dialog-error">{dialogError}</p> : null}
          <div className="app-dialog-actions">
            <Button className="app-dialog-button secondary" onPress={dismissDialog}>{t("common.cancel")}</Button>
            <Button className="app-dialog-button" onPress={handleDialogSubmit}>{t("common.save")}</Button>
          </div>
        </AppDialog>
      ) : null}
    </AppModal>
  );
}
