import { computeWheelLayout, wheelTransform } from "../layout";
import type { WheelOption, WheelState } from "../contracts/types";

export class WheelOverlayRenderer {
  public render(
    container: HTMLElement,
    wheelState: WheelState,
    options: WheelOption[]
  ): void {
    const layout = computeWheelLayout(options.map((option) => option.label));
    const wheel = document.createElement("div");
    wheel.className = "operation-wheel";
    wheel.style.left = `${wheelState.x}px`;
    wheel.style.top = `${wheelState.y}px`;
    wheel.style.width = `${layout.width}px`;
    wheel.style.height = `${layout.height}px`;

    const arc = document.createElement("div");
    arc.className = "operation-wheel-arc";
    wheel.appendChild(arc);

    options.forEach((option, index) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = `wheel-option ${option.className}`;
      if (option.disabled) {
        button.classList.add("disabled");
        button.disabled = true;
      }
      button.style.minWidth = `${layout.buttonMinWidth}px`;
      button.style.padding = `${layout.buttonPaddingY}px ${layout.buttonPaddingX}px`;
      button.style.fontSize = `${layout.buttonFontSize}px`;
      button.style.borderRadius = `${layout.buttonBorderRadius}px`;
      button.style.transform = wheelTransform(index, options.length, {
        angleStart: layout.angleStart,
        angleEnd: layout.angleEnd,
        radius: layout.radius,
        baseX: layout.baseX
      });
      button.textContent = option.label;
      if (!option.disabled) {
        button.addEventListener("click", option.onSelect);
      }
      wheel.appendChild(button);
    });

    container.appendChild(wheel);
  }
}
