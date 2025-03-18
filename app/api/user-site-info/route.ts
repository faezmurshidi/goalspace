import { NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { SiteInfo } from '@/lib/services/siteInfoService';

export async function POST(request: Request) {
  try {
    // Parse the request body
    const siteInfo: SiteInfo = await request.json();
    
    // Create Supabase client
    const supabase = createRouteHandlerClient({ cookies });
    
    // Get the current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }
    
    // Update the site info in the database
    const { error } = await supabase.rpc('update_user_site_info', {
      user_id_param: user.id,
      site_info_param: siteInfo
    });
    
    if (error) {
      console.error('Error updating site info:', error);
      return NextResponse.json(
        { error: 'Failed to update site information' },
        { status: 500 }
      );
    }
    
    return NextResponse.json(
      { success: true, message: 'Site information updated successfully' },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error in site info API:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}

export async function GET(request: Request) {
  try {
    // Create Supabase client
    const supabase = createRouteHandlerClient({ cookies });
    
    // Get the current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }
    
    // Get the user's site info from the database
    const { data, error } = await supabase
      .from('user_settings')
      .select('site_info')
      .eq('user_id', user.id)
      .single();
    
    if (error) {
      console.error('Error fetching site info:', error);
      return NextResponse.json(
        { error: 'Failed to fetch site information' },
        { status: 500 }
      );
    }
    
    return NextResponse.json(
      { siteInfo: data.site_info },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error in site info API:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}