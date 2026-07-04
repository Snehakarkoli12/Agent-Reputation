import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET() {

    console.log("URL:", process.env.NEXT_PUBLIC_SUPABASE_URL);

    const { data, error } = await supabase
        .from("agents")
        .select("*");

    console.log("DATA:", data);
    console.log("ERROR:", error);

    return NextResponse.json({
        data,
        error,
    });
}