import { createDraftAgreement } from './agreements';
import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

jest.mock('@/lib/supabase/server');
jest.mock('next/cache');

describe('agreements server actions', () => {
    const mockUser = { id: 'user-123', email: 'test@example.com' };
    const mockSupabase = {
        auth: {
            getUser: jest.fn(),
        },
        from: jest.fn().mockReturnThis(),
        upsert: jest.fn().mockReturnThis(),
        insert: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn(),
    };

    beforeEach(() => {
        jest.clearAllMocks();
        (createClient as jest.Mock).mockResolvedValue(mockSupabase);
    });

    describe('createDraftAgreement', () => {
        it('returns error if not authenticated', async () => {
            mockSupabase.auth.getUser.mockResolvedValue({ data: { user: null } });
            const formData = new FormData();

            const result = await createDraftAgreement(formData);

            expect(result).toEqual({ error: 'Not authenticated' });
        });

        it('creates a draft agreement successfully', async () => {
            mockSupabase.auth.getUser.mockResolvedValue({ data: { user: mockUser } });
            mockSupabase.single.mockResolvedValue({ data: { id: 'agreement-456' }, error: null });

            const formData = new FormData();
            formData.append('title', 'Test Agreement');
            formData.append('content', 'Some content');

            const result = await createDraftAgreement(formData);

            expect(result).toEqual({ success: true, id: 'agreement-456' });
            expect(mockSupabase.from).toHaveBeenCalledWith('agreements');
            expect(mockSupabase.insert).toHaveBeenCalledWith(expect.objectContaining({
                title: 'Test Agreement',
                content: 'Some content',
                status: 'draft'
            }));
            expect(revalidatePath).toHaveBeenCalledWith('/dashboard');
        });

        it('returns error if title is missing', async () => {
            mockSupabase.auth.getUser.mockResolvedValue({ data: { user: mockUser } });
            const formData = new FormData();
            formData.append('content', 'Some content');

            const result = await createDraftAgreement(formData);

            expect(result).toEqual({ error: 'Title is required' });
        });
    });
});
