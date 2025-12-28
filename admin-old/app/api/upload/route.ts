import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { v4 as uuidv4 } from "uuid";

// Initialize Supabase admin client
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: Request) {
  try {
    // TODO: Add your own authentication and admin role check here.
    // This endpoint is currently not secure.
    
    const formData = await request.formData();

    // Cast to FormData to resolve a TypeScript type collision with Node.js types.
    const file = (formData as unknown as FormData).get("file") as File | null;
    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    // Cast to FormData to resolve a TypeScript type collision with Node.js types.
    const bucket = (formData as unknown as FormData).get("bucket") as string | null;
    if (!bucket) {
      return NextResponse.json({ error: "Invalid bucket name" }, { status: 400 });
    }

    const fileBuffer = await file.arrayBuffer();
    const filePath = `${uuidv4()}-${file.name}`;

    const { error: uploadError } = await supabaseAdmin.storage
      .from(bucket)
      .upload(filePath, fileBuffer, {
        contentType: file.type,
        upsert: false,
      });

    if (uploadError) {
      return NextResponse.json({ error: uploadError.message }, { status: 500 });
    }

    const { data: urlData } = supabaseAdmin.storage
      .from(bucket)
      .getPublicUrl(filePath);

    return NextResponse.json({ publicUrl: urlData.publicUrl });
  } catch (error) {
    console.error("Error in /api/upload:", error);
    return NextResponse.json(
      { error: "An internal server error occurred." },
      { status: 500 }
    );
  }
}
