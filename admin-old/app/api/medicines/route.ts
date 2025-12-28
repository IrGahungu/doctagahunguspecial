import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY! // ⚠️ keep server-only
);

// ✅ READ Medicines + pharmacies
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    let query = supabase.from('medicines').select(`
      *,
      medicine_pharmacies (
        pharmacy_id,
        insurances,
        locations
      )
    `);

    if (id) {
      query = query.eq('id', id);
    }

    const { data, error } = await query;
    if (error) throw error;

    // ✅ Always return array
    return NextResponse.json({ data: Array.isArray(data) ? data : [data] });
  } catch (err: any) {
    console.error('GET error (medicines):', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// ✅ CREATE Medicine + pharmacy links
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    console.log('API POST received body:', body);

    const {
      title,
      name,
      description,
      category_id,
      price,
      original_price,
      image,
      pharmacies,
    } = body;

    if (!title) {
      return NextResponse.json({ error: 'Title is required' }, { status: 400 });
    }

    // 1. Insert medicine
    const { data: medicine, error: medError } = await supabase
      .from('medicines')
      .insert([
        { title, name, description, category_id, price, original_price, image },
      ])
      .select()
      .single();

    if (medError) throw medError;

    // 2. Insert pharmacy links
    if (pharmacies && pharmacies.length > 0) {
      const rows = pharmacies.map((p: any) => ({
        medicine_id: medicine.id,
        pharmacy_id: p.id,
        insurances: p.insurances || [],
        locations: p.locations || [],
      }));
      const { error: linkError } = await supabase
        .from('medicine_pharmacies')
        .insert(rows);
      if (linkError) throw linkError;
    }

    return NextResponse.json({ data: medicine });
  } catch (err: any) {
    console.error('POST error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// ✅ UPDATE Medicine + pharmacy links
export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    console.log('API PUT received body:', body);

    const {
      id,
      title,
      name,
      description,
      category_id,
      price,
      original_price,
      image,
      pharmacies,
    } = body;

    if (!id) {
      return NextResponse.json({ error: 'ID is required' }, { status: 400 });
    }

    // 1. Update medicine
    const { data: medicine, error: medError } = await supabase
      .from('medicines')
      .update({
        title,
        name,
        description,
        category_id,
        price,
        original_price,
        image,
      })
      .eq('id', id)
      .select()
      .single();

    if (medError) throw medError;

    // 2. Replace pharmacy links (delete old, insert new)
    await supabase.from('medicine_pharmacies').delete().eq('medicine_id', id);

    if (pharmacies && pharmacies.length > 0) {
      const rows = pharmacies.map((p: any) => ({
        medicine_id: id,
        pharmacy_id: p.id,
        insurances: p.insurances || [],
        locations: p.locations || [],
      }));
      const { error: linkError } = await supabase
        .from('medicine_pharmacies')
        .insert(rows);
      if (linkError) throw linkError;
    }

    return NextResponse.json({ data: medicine });
  } catch (err: any) {
    console.error('PUT error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// ✅ DELETE Medicine + pharmacy links
export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'ID is required' }, { status: 400 });
    }

    // 1. Delete pharmacy links
    await supabase.from('medicine_pharmacies').delete().eq('medicine_id', id);

    // 2. Delete medicine
    const { data, error } = await supabase
      .from('medicines')
      .delete()
      .eq('id', id);
    if (error) throw error;

    return NextResponse.json({ data });
  } catch (err: any) {
    console.error('DELETE error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
