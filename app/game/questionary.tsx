import { Image } from "expo-image";
import { StyleSheet, TextInput } from "react-native";

import ParallaxScrollView from "@/components/parallax-scroll-view";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { useGlobalStyles } from "@/constants/styles";
import { useRouter } from "expo-router";
import { useState } from "react";

export default function HomeScreen() {
  const globalStyles = useGlobalStyles();
  const router = useRouter();
  const [text, setText]= useState('');
  
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
          <ThemedText type="title">Finale Challenge!</ThemedText>
          <ThemedText type="defaultSemiBold">
            Fast geschafft beantworte noch diese Frage !
          </ThemedText>
        </ThemedView>
        <ThemedView style={styles.midContainer}>
        <TextInput style={styles.input} onChangeText={setText} value={text}></TextInput>

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
  midContainer: {
    gap: 20,
    padding: 20,
  },
  hintContainer: {
    padding: 20,
    textAlign: "center",
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
  },
  input:{
     height: 40,
    margin: 12,
    borderWidth: 1,
    borderColor:"white",
    padding: 10,
    color:"white",
  },
});
