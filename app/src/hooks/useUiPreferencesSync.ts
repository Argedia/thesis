import { useEffect } from "react";
import { LocalUiPreferencesRepository } from "@thesis/storage";
import { useUiLayoutStore } from "../store/useUiLayoutStore";

const repository = new LocalUiPreferencesRepository();

export function useUiPreferencesSync() {
  const hydrate = useUiLayoutStore((state) => state.hydrate);
  const player = useUiLayoutStore((state) => state.player);
  const editor = useUiLayoutStore((state) => state.editor);

  useEffect(() => {
    let active = true;

    const load = async () => {
      const saved = await repository.loadPreferences();
      if (active && saved) {
        hydrate(saved);
      }
    };

    void load();

    return () => {
      active = false;
    };
  }, [hydrate]);

  useEffect(() => {
    void repository.savePreferences({
      player,
      editor
    });
  }, [editor, player]);
}
