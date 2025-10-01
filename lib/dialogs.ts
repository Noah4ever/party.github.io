import { Platform, Alert as RNAlert } from "react-native";

type ShowOptions = {
  title?: string;
  message: string;
  okLabel?: string;
};

type ConfirmOptions = {
  title?: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
};

const buildMessage = (title?: string, message?: string) => {
  if (!title) return message ?? "";
  return message ? `${title}\n\n${message}` : title;
};

export function showAlert({ title, message, okLabel }: ShowOptions) {
  if (Platform.OS === "web") {
    if (typeof window !== "undefined" && window.alert) {
      window.alert(buildMessage(title, message));
    } else {
      console.warn("Alert:", title, message);
    }
    return;
  }

  RNAlert.alert(title ?? "", message, [{ text: okLabel ?? "OK" }]);
}

export function showError(message: string, title = "Fehler") {
  showAlert({ title, message });
}

export async function confirm({
  title,
  message,
  confirmLabel = "OK",
  cancelLabel = "Abbrechen",
  destructive,
}: ConfirmOptions): Promise<boolean> {
  if (Platform.OS === "web") {
    if (typeof window !== "undefined" && window.confirm) {
      return window.confirm(buildMessage(title, message));
    }
    console.warn("Confirm fallback:", title, message);
    return false;
  }

  return new Promise((resolve) => {
    RNAlert.alert(title ?? "", message, [
      { text: cancelLabel, style: "cancel", onPress: () => resolve(false) },
      {
        text: confirmLabel,
        style: destructive ? "destructive" : "default",
        onPress: () => resolve(true),
      },
    ]);
  });
}
