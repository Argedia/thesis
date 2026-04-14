import type { ReactNode } from "react";
import {
  Dialog,
  Modal,
  ModalOverlay,
  Popover,
  Heading,
  type DialogProps,
  type ModalOverlayProps,
  type PopoverProps
} from "react-aria-components";

export interface AppModalProps extends Pick<ModalOverlayProps, "isOpen" | "onOpenChange" | "isDismissable"> {
  children: ReactNode;
  className?: string;
}

export function AppModal({
  isOpen,
  onOpenChange,
  isDismissable = true,
  children,
  className
}: AppModalProps) {
  return (
    <ModalOverlay
      isOpen={isOpen}
      onOpenChange={onOpenChange}
      isDismissable={isDismissable}
      className="app-modal-overlay"
    >
      <Modal className={`app-modal${className ? ` ${className}` : ""}`}>{children}</Modal>
    </ModalOverlay>
  );
}

export interface AppPopoverProps extends Pick<PopoverProps, "placement" | "offset"> {
  children: ReactNode;
  className?: string;
}

export function AppPopover({
  placement = "bottom end",
  offset = 10,
  children,
  className
}: AppPopoverProps) {
  return (
    <Popover
      placement={placement}
      offset={offset}
      className={`app-popover${className ? ` ${className}` : ""}`}
    >
      {children}
    </Popover>
  );
}

export interface AppDialogProps extends Pick<DialogProps, "aria-label"> {
  title?: string;
  children: ReactNode;
  className?: string;
}

export function AppDialog({ title, children, className, ...props }: AppDialogProps) {
  return (
    <Dialog {...props} className={`app-dialog${className ? ` ${className}` : ""}`}>
      {title ? <Heading slot="title" className="app-dialog-title">{title}</Heading> : null}
      {children}
    </Dialog>
  );
}
