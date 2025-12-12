
import { Flight } from "../types";

/**
 * Calculates Crew Flight Duty Period stats
 */
export const calculateFDP = (flights: Flight[], memberCode: string, referenceDate: Date = new Date()) => {
    // Reset times to compare dates properly
    const todayStr = referenceDate.toISOString().split('T')[0];
    
    // Weekly (Last 7 days)
    const weekAgo = new Date(referenceDate);
    weekAgo.setDate(referenceDate.getDate() - 7);

    // Monthly (Current Month)
    const startOfMonth = new Date(referenceDate.getFullYear(), referenceDate.getMonth(), 1);

    let daily = 0;
    let weekly = 0;
    let monthly = 0;

    flights.forEach(f => {
        if (!f.flightTime) return;
        // Check participation
        if (f.pic === memberCode || f.sic === memberCode) {
            const fDate = new Date(f.date);
            
            // Daily
            if (f.date === todayStr) {
                daily += f.flightTime;
            }
            
            // Weekly
            if (fDate >= weekAgo && fDate <= referenceDate) {
                weekly += f.flightTime;
            }
            
            // Monthly
            if (fDate >= startOfMonth && fDate <= referenceDate) {
                monthly += f.flightTime;
            }
        }
    });

    return { daily, weekly, monthly };
};

/**
 * Calculates time duration in decimal hours between two HH:MM strings.
 * Handles crossing midnight (e.g. 23:00 to 01:00).
 */
export const calculateDuration = (start: string, end: string): number => {
    if (!start || !end) return 0;
    const [h1, m1] = start.split(':').map(Number);
    const [h2, m2] = end.split(':').map(Number);
    if (isNaN(h1) || isNaN(m1) || isNaN(h2) || isNaN(m2)) return 0;
    
    let diff = (h2 * 60 + m2) - (h1 * 60 + m1);
    if (diff < 0) diff += 24 * 60; // Handle midnight crossing
    return parseFloat((diff / 60).toFixed(2));
};

/**
 * Converts decimal hours (1.5) to H:MM string ("1:30")
 */
export const decimalToHm = (val?: number): string => {
    if (val === undefined || val === null || isNaN(val)) return '';
    const hrs = Math.floor(val);
    const mins = Math.round((val - hrs) * 60);
    const minsStr = mins.toString().padStart(2, '0');
    return `${hrs}:${minsStr}`;
};

/**
 * Converts input string ("1:30" or "1.5") to decimal hours (1.5)
 */
export const hmToDecimal = (str: string | undefined): number => {
    if (!str) return 0;
    
    // Check for colon format (H:MM)
    if (str.includes(':')) {
        const [h, m] = str.split(':').map(Number);
        const hours = isNaN(h) ? 0 : h;
        const minutes = isNaN(m) ? 0 : m;
        return hours + (minutes / 60);
    }
    
    // Fallback to direct float parsing (legacy support for 1.5)
    return parseFloat(str) || 0;
};

/**
 * Maintenance Status Calculator
 */
export const calculateMaintenanceStatus = (currentHours: number, interval: number, lastPerformed: number) => {
    const nextDue = lastPerformed + interval;
    const remaining = nextDue - currentHours;
    const percentageUsed = Math.min(100, Math.max(0, ((currentHours - lastPerformed) / interval) * 100));
    
    let status: 'Good' | 'Warning' | 'Critical' = 'Good';
    if (remaining <= 0) status = 'Critical';
    else if (remaining < 50) status = 'Warning';

    return { nextDue, remaining, percentageUsed, status };
};
