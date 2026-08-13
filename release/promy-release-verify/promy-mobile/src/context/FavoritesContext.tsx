import AsyncStorage from "@react-native-async-storage/async-storage";
import React, {
  createContext,
  PropsWithChildren,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useAuth } from "./AuthContext";
import type {
  ApiCategory,
  ApiCity,
  ApiCommerce,
  PromotionDetail,
  CommerceDetail,
  PromotionType,
  ValidationMethod,
} from "../types/api";

const STORAGE_PREFIX = "@promy/favorites";

type FavoriteCommerceSnapshot = {
  id: number;
  name: string;
  slug: string;
  shortDescription?: string | null;
  description?: string | null;
  address?: string | null;
  phone?: string | null;
  logoUrl?: string | null;
  coverUrl?: string | null;
  city?: ApiCity | null;
  category?: ApiCategory | null;
};

export type FavoritePromotionItem = {
  id: number;
  title: string;
  description?: string | null;
  promotionType: PromotionType;
  validationMethod: ValidationMethod;
  discountValue?: number | null;
  conditions?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  startTime?: string | null;
  endTime?: string | null;
  imageUrl?: string | null;
  commerce: FavoriteCommerceSnapshot;
  savedAt: string;
};

export type FavoriteCommerceItem = FavoriteCommerceSnapshot & {
  promotionsCount: number;
  savedAt: string;
};

type FavoritesStorage = {
  promotions: FavoritePromotionItem[];
  commerces: FavoriteCommerceItem[];
};

type FavoritesContextValue = {
  favoritePromotions: FavoritePromotionItem[];
  favoriteCommerces: FavoriteCommerceItem[];
  isLoadingFavorites: boolean;
  isPromotionFavorite: (promotionId: number) => boolean;
  isCommerceFavorite: (commerceId: number) => boolean;
  togglePromotionFavorite: (promotion: PromotionDetail) => Promise<boolean>;
  toggleCommerceFavorite: (commerce: CommerceDetail) => Promise<boolean>;
  removePromotionFavorite: (promotionId: number) => Promise<void>;
  removeCommerceFavorite: (commerceId: number) => Promise<void>;
};

const FavoritesContext = createContext<FavoritesContextValue | undefined>(undefined);

function getStorageKey(userId: number) {
  return `${STORAGE_PREFIX}/${userId}`;
}

function buildCommerceSnapshot(commerce: ApiCommerce): FavoriteCommerceSnapshot {
  return {
    id: commerce.id,
    name: commerce.name,
    slug: commerce.slug,
    shortDescription: commerce.shortDescription,
    description: commerce.description,
    address: commerce.address,
    phone: commerce.phone,
    logoUrl: commerce.logoUrl,
    coverUrl: commerce.coverUrl,
    city: commerce.city,
    category: commerce.category,
  };
}

function buildFavoritePromotion(promotion: PromotionDetail): FavoritePromotionItem {
  return {
    id: promotion.id,
    title: promotion.title,
    description: promotion.description,
    promotionType: promotion.promotionType,
    validationMethod: promotion.validationMethod,
    discountValue: promotion.discountValue,
    conditions: promotion.conditions,
    startDate: promotion.startDate,
    endDate: promotion.endDate,
    startTime: promotion.startTime,
    endTime: promotion.endTime,
    imageUrl: promotion.imageUrl,
    commerce: buildCommerceSnapshot(promotion.commerce),
    savedAt: new Date().toISOString(),
  };
}

function buildFavoriteCommerce(commerce: CommerceDetail): FavoriteCommerceItem {
  return {
    ...buildCommerceSnapshot(commerce),
    promotionsCount: commerce.promotions?.length || 0,
    savedAt: new Date().toISOString(),
  };
}

export function FavoritesProvider({ children }: PropsWithChildren) {
  const { session } = useAuth();
  const [favoritePromotions, setFavoritePromotions] = useState<FavoritePromotionItem[]>([]);
  const [favoriteCommerces, setFavoriteCommerces] = useState<FavoriteCommerceItem[]>([]);
  const [isLoadingFavorites, setIsLoadingFavorites] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const restoreFavorites = async () => {
      if (!session?.user.id) {
        setFavoritePromotions([]);
        setFavoriteCommerces([]);
        setIsLoadingFavorites(false);
        return;
      }

      try {
        setIsLoadingFavorites(true);
        const raw = await AsyncStorage.getItem(getStorageKey(session.user.id));

        if (cancelled) return;

        if (!raw) {
          setFavoritePromotions([]);
          setFavoriteCommerces([]);
          return;
        }

        const parsed = JSON.parse(raw) as Partial<FavoritesStorage>;
        setFavoritePromotions(parsed.promotions ?? []);
        setFavoriteCommerces(parsed.commerces ?? []);
      } catch (error) {
        console.warn("No pudimos restaurar favoritos", error);
        if (!cancelled) {
          setFavoritePromotions([]);
          setFavoriteCommerces([]);
        }
      } finally {
        if (!cancelled) {
          setIsLoadingFavorites(false);
        }
      }
    };

    void restoreFavorites();

    return () => {
      cancelled = true;
    };
  }, [session?.user.id]);

  const persistFavorites = async (
    nextPromotions: FavoritePromotionItem[],
    nextCommerces: FavoriteCommerceItem[],
  ) => {
    if (!session?.user.id) return;

    try {
      await AsyncStorage.setItem(
        getStorageKey(session.user.id),
        JSON.stringify({
          promotions: nextPromotions,
          commerces: nextCommerces,
        } satisfies FavoritesStorage),
      );
    } catch (error) {
      console.warn("No pudimos guardar favoritos", error);
    }
  };

  const value = useMemo<FavoritesContextValue>(
    () => ({
      favoritePromotions,
      favoriteCommerces,
      isLoadingFavorites,
      isPromotionFavorite: (promotionId: number) =>
        favoritePromotions.some((item) => item.id === promotionId),
      isCommerceFavorite: (commerceId: number) =>
        favoriteCommerces.some((item) => item.id === commerceId),
      togglePromotionFavorite: async (promotion: PromotionDetail) => {
        const exists = favoritePromotions.some((item) => item.id === promotion.id);
        const nextPromotions = exists
          ? favoritePromotions.filter((item) => item.id !== promotion.id)
          : [buildFavoritePromotion(promotion), ...favoritePromotions];

        setFavoritePromotions(nextPromotions);
        await persistFavorites(nextPromotions, favoriteCommerces);
        return !exists;
      },
      toggleCommerceFavorite: async (commerce: CommerceDetail) => {
        const exists = favoriteCommerces.some((item) => item.id === commerce.id);
        const nextCommerces = exists
          ? favoriteCommerces.filter((item) => item.id !== commerce.id)
          : [buildFavoriteCommerce(commerce), ...favoriteCommerces];

        setFavoriteCommerces(nextCommerces);
        await persistFavorites(favoritePromotions, nextCommerces);
        return !exists;
      },
      removePromotionFavorite: async (promotionId: number) => {
        const nextPromotions = favoritePromotions.filter((item) => item.id !== promotionId);
        setFavoritePromotions(nextPromotions);
        await persistFavorites(nextPromotions, favoriteCommerces);
      },
      removeCommerceFavorite: async (commerceId: number) => {
        const nextCommerces = favoriteCommerces.filter((item) => item.id !== commerceId);
        setFavoriteCommerces(nextCommerces);
        await persistFavorites(favoritePromotions, nextCommerces);
      },
    }),
    [favoriteCommerces, favoritePromotions, isLoadingFavorites, session?.user.id],
  );

  return <FavoritesContext.Provider value={value}>{children}</FavoritesContext.Provider>;
}

export function useFavorites() {
  const context = useContext(FavoritesContext);

  if (!context) {
    throw new Error("useFavorites debe usarse dentro de FavoritesProvider");
  }

  return context;
}
