import React from "react";
import AuthNavigator from "./AuthNavigator";
import CommerceStackNavigator from "./CommerceStackNavigator";
import MainStackNavigator from "./MainStackNavigator";
import SplashScreen from "../screens/auth/SplashScreen";
import RoleGuardScreen from "../screens/system/RoleGuardScreen";
import { useAuth } from "../context/AuthContext";

export default function AppNavigator() {
  const { session, isBootstrapping } = useAuth();

  if (isBootstrapping) {
    return <SplashScreen />;
  }

  if (!session) {
    return <AuthNavigator />;
  }

  if (session.user.role === "CLIENT") {
    return <MainStackNavigator />;
  }

  if (session.user.role === "COMMERCE") {
    return <CommerceStackNavigator />;
  }

  return <RoleGuardScreen role={session.user.role} />;
}
