import { db } from './db';

export type NotificationType =
    | 'booking_created'
    | 'booking_confirmed'
    | 'booking_cancelled'
    | 'low_stock'
    | 'payment_received'
    | 'appointment_reminder';

interface CreateNotificationParams {
    userIds: number[];
    type: NotificationType;
    title: string;
    message: string;
    link?: string;
}

export function createNotification(params: CreateNotificationParams) {
    const insert = db.prepare(`
    INSERT INTO notifications (user_id, type, title, message, link)
    VALUES (?, ?, ?, ?, ?)
  `);

    for (const userId of params.userIds) {
        insert.run(userId, params.type, params.title, params.message, params.link || null);
    }
}

export function getUnreadNotifications(userId: number) {
    return db.prepare(`
    SELECT * FROM notifications 
    WHERE user_id = ? AND is_read = 0 
    ORDER BY created_at DESC 
    LIMIT 50
  `).all(userId);
}

export function getAllNotifications(userId: number, limit = 100) {
    return db.prepare(`
    SELECT * FROM notifications 
    WHERE user_id = ? 
    ORDER BY created_at DESC 
    LIMIT ?
  `).all(userId, limit);
}

export function markAsRead(notificationId: number) {
    db.prepare(`
    UPDATE notifications 
    SET is_read = 1 
    WHERE id = ?
  `).run(notificationId);
}

export function markAllAsRead(userId: number) {
    db.prepare(`
    UPDATE notifications 
    SET is_read = 1 
    WHERE user_id = ?
  `).run(userId);
}

export function getUnreadCount(userId: number): number {
    const result = db.prepare(`
    SELECT COUNT(*) as count 
    FROM notifications 
    WHERE user_id = ? AND is_read = 0
  `).get(userId) as { count: number };

    return result.count;
}

// Helper: Get all assistant user IDs
export function getAllAssistantIds(): number[] {
    const results = db.prepare(`
    SELECT id FROM users WHERE role = 'assistant'
  `).all() as { id: number }[];

    return results.map(r => r.id);
}

// Helper: Get all doctor user IDs
export function getAllDoctorIds(): number[] {
    const results = db.prepare(`
    SELECT id FROM users WHERE role = 'doctor'
  `).all() as { id: number }[];

    return results.map(r => r.id);
}

// Helper: Get admin user IDs
export function getAllAdminIds(): number[] {
    const results = db.prepare(`
    SELECT id FROM users WHERE role = 'admin'
  `).all() as { id: number }[];

    return results.map(r => r.id);
}

// Helper: Get all user IDs (doctors + assistants + admins)
export function getAllStaffIds(): number[] {
    const results = db.prepare(`
    SELECT id FROM users WHERE role IN ('doctor', 'assistant', 'admin')
  `).all() as { id: number }[];

    return results.map(r => r.id);
}
