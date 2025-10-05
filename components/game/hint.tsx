// components/PopupModal.tsx
import { useTheme } from "@/constants/theme";
import React from "react";
import { Modal, StyleSheet, TouchableOpacity, View } from "react-native";
import { ThemedText } from "../themed-text";
import { Button } from "./Button";

type PopupModalProps = {
  visible: boolean;
  onClose: () => void;
  title?: string;
  content?: string;
};

export const PopupModal: React.FC<PopupModalProps> = ({
  visible,
  onClose,
  title = "Hinweis",
  content = "Hier ist dein Popup-Text",
}) => {
  const theme = useTheme();
  return (
    <Modal
      animationType="fade"
      transparent={true}
      visible={visible}
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <TouchableOpacity style={StyleSheet.absoluteFill} onPress={onClose} />

        <View
          style={[
            styles.modalContainer,
            {
              backgroundColor: theme.backgroundAlt,
            },
          ]}
        >
          <ThemedText style={[styles.title]}>{title}</ThemedText>
          <ThemedText style={styles.content}>{content}</ThemedText>

          <Button
            onPress={onClose}
            iconText="checkmark.circle.outline"
            style={{ height: 50, marginTop: 20 }}
          >
            Check!
          </Button>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContainer: {
    width: 300,
    borderRadius: 20,
    padding: 20,
    alignItems: "center",
    position: "relative",
  },
  closeButton: {
    position: "absolute",
    top: 10,
    right: 10,
    padding: 5,
  },
  closeText: {
    fontSize: 20,
    fontWeight: "bold",
  },
  title: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 10,
  },
  content: {
    fontSize: 16,
    textAlign: "center",
  },
});
