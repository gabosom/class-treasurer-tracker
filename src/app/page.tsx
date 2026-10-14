import { redirect } from "next/navigation";

// Directiva is the default tab (D16).
export default function Home() {
  redirect("/directiva");
}
