import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { gameApi } from "@/lib/api";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  BarcodeScanningResult,
  CameraView,
  useCameraPermissions,
} from "expo-camera";
import { useRouter } from "expo-router";
import { Button } from "react-native";

//TODO: NOAH fix access Button

export default function CameraModal() {
  const router = useRouter();
  const [permission, requestPermission] = useCameraPermissions();
  if (!permission) {
    return <></>;
  }
  return (
    <ThemedView style={{ flex: 1 }}>
      {!permission.granted && (
        <Button title="Zugriff erlauben" onPress={requestPermission} />
      )}
      <ThemedView
        style={{
          justifyContent: "center",
          alignItems: "center",
          flex: 1,
          gap: 24,
        }}
      >
        <ThemedText type="title" style={{ textAlign: "center" }}>
          Scan Partner QR-Code
        </ThemedText>
        <ThemedView
          style={{
            height: 400,
            width: "80%",
            borderRadius: 50,
            overflow: "hidden",
          }}
        >
          <CameraView
            style={{ flex: 1 }}
            facing="back"
            barcodeScannerSettings={{
              barcodeTypes: ["qr"],
            }}
            onBarcodeScanned={async (scanningResult: BarcodeScanningResult) => {
              // TODO: Green border or something so the user knows that it was correct
              // TODO: in scanningResult.data is the content of the qr code
              const guestId = await AsyncStorage.getItem("guestId");
              if (guestId) {
                const partnerId = scanningResult.data;
                const result = await gameApi.verifyPartner(guestId, partnerId);
                if ("match" in result && result.match && result.groupId) {
                  AsyncStorage.setItem("groupId", result.groupId);
                  router.back();
                  router.navigate("/game/challenge_2");
                }
              }
            }}
          />
        </ThemedView>
      </ThemedView>
    </ThemedView>
  );
}
