import * as React from "react";
import { NavigationContainerRef } from "@react-navigation/native";

export const navRef: React.RefObject<NavigationContainerRef<any>> = React.createRef();

export function navigate(name: string, params?: Record<string, any>) {
  if (navRef.current) {
    // @ts-ignore – it’s fine for generic usage
    navRef.current.navigate(name as never, params as never);
  }
}