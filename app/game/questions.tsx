import { Image } from "expo-image";
import { StyleSheet, TouchableOpacity } from "react-native";

import ParallaxScrollView from "@/components/parallax-scroll-view";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { useGlobalStyles } from "@/constants/styles";
import { Checkbox } from 'expo-checkbox';
import { useRouter } from "expo-router";
import React, { useState } from "react";

export default function HomeScreen() {
  const globalStyles = useGlobalStyles();
  const router = useRouter();
  const [isChecked, setChecked] = useState(false);
  return (
    <ThemedView style={{ flex: 1 }}>
      <ParallaxScrollView
        headerBackgroundColor={{ light: "#A1CEDC", dark: "#1D3D47" }}
        headerImage={
          <Image
            source={require("@/assets/images/crown.png")}
            style={styles.papaLogo}
          />
        }
      >

        <ThemedView style={styles.textContainer}>
          <ThemedText type="title">Frage 1/15</ThemedText>
          <ThemedText type="defaultSemiBold">
            Es gibt nur eine Auswahlmöglichkeit!
          </ThemedText>
          <ThemedText>
            Frage: ....
          </ThemedText>
        </ThemedView>

  <ThemedView style={styles.checkContainer}>
            <Checkbox style={globalStyles.checkBox} value={isChecked} onValueChange={setChecked}/>
            <ThemedText type="normal">Checkbox</ThemedText>
        </ThemedView>
        
         <ThemedView>
                  <TouchableOpacity
                    style={globalStyles.button}
                    onPress={() => {
                      router.navigate("/game/questionary");
                    }}
                  >
                    <ThemedText style={globalStyles.buttonText}>
                      Check
                    </ThemedText>
                  </TouchableOpacity>
                  </ThemedView>
        
      </ParallaxScrollView>
      <ThemedText style={styles.hintContainer}>
        PS: Schummeln ist für Loser, es geht hier um Spaß!
      </ThemedText>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  papaLogo: {
    height: 180,
    width: 290,
    bottom: 0,
    top: 0,
    right: 0,
    position: "absolute",
  },
  textContainer: {
    gap: 20,
  },
  checkContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  hintContainer: {
    padding: 20,
    textAlign: "center",
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
  },
  
});
