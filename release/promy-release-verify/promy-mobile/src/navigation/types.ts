export type AuthStackParamList = {
  Onboarding: undefined;
  Login: undefined;
  Register: undefined;
  Legal: {
    kind: "terms" | "privacy";
  };
};

import type { NavigatorScreenParams } from "@react-navigation/native";

export type MainTabParamList = {
  Inicio: undefined;
  Mapa: undefined;
  Explorar: undefined;
  Perfil: undefined;
};

export type MainStackParamList = {
  Tabs: NavigatorScreenParams<MainTabParamList> | undefined;
  PromotionDetail: {
    promotionId: number;
  };
  CommerceDetail: {
    commerceId: number;
  };
  Redemptions: undefined;
  Favorites: undefined;
  Notifications: undefined;
  Legal: {
    kind: "terms" | "privacy";
  };
};

export type CommerceStackParamList = {
  CommerceDashboard: undefined;
  CommerceProfile: undefined;
  CommercePromotions: undefined;
  CommercePromotionEditor: {
    promotionId?: number;
  };
  CommerceRedemptions: undefined;
};
