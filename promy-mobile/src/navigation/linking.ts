import type { LinkingOptions } from "@react-navigation/native";
import type { MainStackParamList } from "./types";
import { getMobileDeepLinkPrefixes } from "../services/deepLinks";

export const mobileLinking: LinkingOptions<MainStackParamList> = {
  prefixes: getMobileDeepLinkPrefixes(),
  config: {
    screens: {
      Tabs: {
        screens: {
          Inicio: "home",
          Mapa: "map",
          Explorar: "explore",
          Perfil: "profile",
        },
      },
      PromotionDetail: "promotion/:promotionId",
      CommerceDetail: "commerce/:commerceId",
      Redemptions: {
        path: "validate",
        parse: {
          validationCode: (value: string) => value,
        },
      },
      Favorites: "favorites",
      Notifications: "notifications",
    },
  },
};
