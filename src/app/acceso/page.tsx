import { redirect } from "next/navigation";

// The families code page is off for now (D16): everyone signs in on /directiva.
export default function AccessPage() {
  redirect("/directiva");
}
