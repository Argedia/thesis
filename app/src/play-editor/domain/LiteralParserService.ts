import type { DataValue } from "@thesis/core-engine";

export class LiteralParserService {
  public parseLiteralInput(rawValue: string): DataValue {
    const trimmed = rawValue.trim();

    if (
      trimmed.length >= 2 &&
      trimmed.startsWith("\"") &&
      trimmed.endsWith("\"")
    ) {
      return trimmed.slice(1, -1);
    }

    if (/^(true|false)$/i.test(trimmed)) {
      return trimmed.toLocaleLowerCase() === "true";
    }

    if (/^[+-]?\d+$/.test(trimmed)) {
      return Number(trimmed);
    }

    if (/^[+-]?\d+(?:[.,]\d+)?$/.test(trimmed)) {
      return Number(trimmed.replace(",", "."));
    }

    return trimmed;
  }
}
