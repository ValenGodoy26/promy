import AsyncStorage from "@react-native-async-storage/async-storage";
import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";
import { createSessionStorage } from "./sessionStorageCore";

const native = Platform.OS === "android" || Platform.OS === "ios";

const sessionStorage = createSessionStorage({
  native,
  secure: {
    isAvailable: SecureStore.isAvailableAsync,
    getItem: SecureStore.getItemAsync,
    setItem: SecureStore.setItemAsync,
    removeItem: SecureStore.deleteItemAsync,
  },
  browser: {
    getItem: AsyncStorage.getItem,
    setItem: AsyncStorage.setItem,
    removeItem: AsyncStorage.removeItem,
  },
});

export const readStoredSession = sessionStorage.read;
export const writeStoredSession = sessionStorage.write;
export const clearStoredSession = sessionStorage.clear;
