import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET() {
    try {
        const supabase = await createClient();

        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
        }

        // Get user profile with points and check-in info
        let { data: profile, error } = await supabase
            .from('users')
            .select('points, last_check_in, check_in_streak')
            .eq('id', user.id)
            .single();

        // Self-healing: Create profile if missing
        if (error && error.code === 'PGRST116') {
            console.log('Profile missing for user, creating one...', user.id);
            const { error: insertError } = await supabase.from('users').insert({
                id: user.id,
                email: user.email!,
                name: user.user_metadata?.name || user.email?.split('@')[0] || 'User',
                role: 'USER',
                points: 200 // Give welcome points even for late creation
            });

            if (insertError) {
                console.error('Failed to auto-create profile:', insertError);
                throw insertError;
            }

            // Retry fetch
            const { data: newProfile, error: retryError } = await supabase
                .from('users')
                .select('points, last_check_in, check_in_streak')
                .eq('id', user.id)
                .single();

            if (retryError) throw retryError;
            profile = newProfile;
            error = null;
        } else if (error) {
            throw error;
        }

        // Check if user can check in today
        const today = new Date().toISOString().split('T')[0];
        const lastCheckIn = profile?.last_check_in ?
            new Date(profile.last_check_in).toISOString().split('T')[0] : null;

        const canCheckIn = lastCheckIn !== today;

        return NextResponse.json({
            points: profile?.points || 0,
            streak: profile?.check_in_streak || 0,
            lastCheckIn: profile?.last_check_in,
            canCheckIn
        });
    } catch (error) {
        console.error('Error getting check-in status:', error);
        return NextResponse.json({ error: 'Failed to get check-in status' }, { status: 500 });
    }
}

export async function POST() {
    try {
        const supabase = await createClient();

        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
        }

        // Get current user profile
        const { data: profile, error: fetchError } = await supabase
            .from('users')
            .select('points, last_check_in, check_in_streak')
            .eq('id', user.id)
            .single();

        if (fetchError) throw fetchError;

        // Check if already checked in today
        const today = new Date();
        const todayStr = today.toISOString().split('T')[0];
        const lastCheckIn = profile?.last_check_in ?
            new Date(profile.last_check_in) : null;
        const lastCheckInStr = lastCheckIn ?
            lastCheckIn.toISOString().split('T')[0] : null;

        if (lastCheckInStr === todayStr) {
            return NextResponse.json({
                error: '今天已经签到过了',
                alreadyCheckedIn: true
            }, { status: 400 });
        }

        // Calculate streak
        let newStreak = 1;
        if (lastCheckIn) {
            const yesterday = new Date(today);
            yesterday.setDate(yesterday.getDate() - 1);
            const yesterdayStr = yesterday.toISOString().split('T')[0];

            if (lastCheckInStr === yesterdayStr) {
                // Consecutive day
                newStreak = (profile?.check_in_streak || 0) + 1;
            }
            // Otherwise streak resets to 1
        }

        // Calculate points earned based on streak
        let pointsEarned = 10; // Base: 1-7 days
        if (newStreak > 30) {
            pointsEarned = 30; // 30+ days
        } else if (newStreak > 7) {
            pointsEarned = 20; // 7-30 days
        }

        const totalPoints = pointsEarned;
        const newPoints = (profile?.points || 0) + totalPoints;

        // Update user
        const { error: updateError } = await supabase
            .from('users')
            .update({
                points: newPoints,
                last_check_in: today.toISOString(),
                check_in_streak: newStreak,
                updated_at: today.toISOString()
            })
            .eq('id', user.id);

        if (updateError) throw updateError;

        // Add point log
        await supabase.from('point_logs').insert({
            user_id: user.id,
            amount: totalPoints,
            reason: `每日签到 +${pointsEarned} (连续${newStreak}天)`,
            type: 'EARN'
        });

        return NextResponse.json({
            success: true,
            pointsEarned: totalPoints,
            newPoints,
            streak: newStreak
        });
    } catch (error) {
        console.error('Error checking in:', error);
        return NextResponse.json({ error: 'Failed to check in' }, { status: 500 });
    }
}
