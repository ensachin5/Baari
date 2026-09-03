"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthSession } from "@/lib/auth-client";
import { api } from "@/lib/api";
import { useSession } from "@/store/session";

export default function RootIndexPage() {
  const router = useRouter();
  const { data: session, isPending: sessionLoading } = useAuthSession();
  const { setUser, setActiveFlat, hydrate } = useSession();

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  useEffect(() => {
    if (sessionLoading) return;

    if (!session?.user) {
      router.replace("/sign-in");
      return;
    }

    setUser({
      id: session.user.id,
      name: session.user.name || "User",
      email: session.user.email,
      image: session.user.image,
    });

    api
      .get<{ flat: any }>("/api/flats/me")
      .then((res) => {
        if (res?.flat) {
          setActiveFlat(res.flat);
          router.replace("/home");
        } else {
          setActiveFlat(null);
          router.replace("/choose");
        }
      })
      .catch((err) => {
        console.warn("Error resolving current flat:", err);
        router.replace("/choose");
      });
  }, [session, sessionLoading, router, setUser, setActiveFlat]);

  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center p-6">
      <div className="flex flex-col items-center gap-4">
        <div className="w-14 h-14 rounded-2xl bg-navy text-white flex items-center justify-center font-bold text-2xl shadow-sm animate-pulse">
          B
        </div>
        <p className="text-black-light text-body-small font-medium">
          Loading Baari...
        </p>
      </div>
    </div>
  );
}
