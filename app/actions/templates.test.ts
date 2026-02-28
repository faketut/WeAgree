import { createTemplate, updateTemplate, deleteTemplate } from './templates';
import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

jest.mock('@/lib/supabase/server');
jest.mock('next/cache');

describe('templates server actions', () => {
    const mockUser = { id: 'user-123', email: 'test@example.com' };
    const mockQueryBuilder = {
        from: jest.fn().mockReturnThis(),
        insert: jest.fn().mockReturnThis(),
        update: jest.fn().mockReturnThis(),
        delete: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockReturnThis(),
        then: jest.fn((cb) => cb({ data: null, error: null })),
    };

    const mockSupabase = {
        auth: {
            getUser: jest.fn(),
        },
        from: jest.fn(() => mockQueryBuilder),
    };

    beforeEach(() => {
        jest.clearAllMocks();
        (createClient as jest.Mock).mockResolvedValue(mockSupabase);
        mockQueryBuilder.then.mockImplementation((cb) => Promise.resolve(cb({ data: null, error: null })));
        mockQueryBuilder.single.mockResolvedValue({ data: null, error: null });
    });

    describe('createTemplate', () => {
        it('returns error if not authenticated', async () => {
            mockSupabase.auth.getUser.mockResolvedValue({ data: { user: null } });
            const formData = new FormData();

            const result = await createTemplate(formData);

            expect(result).toEqual({ error: 'Not authenticated' });
        });

        it('creates a template successfully', async () => {
            mockSupabase.auth.getUser.mockResolvedValue({ data: { user: mockUser } });

            const formData = new FormData();
            formData.append('title', 'Test Template');
            formData.append('content', 'Some template content');

            const result = await createTemplate(formData);

            expect(result).toEqual({ success: true });
            expect(mockSupabase.from).toHaveBeenCalledWith('templates');
            expect(mockQueryBuilder.insert).toHaveBeenCalledWith({
                user_id: mockUser.id,
                title: 'Test Template',
                content: 'Some template content',
            });
            expect(revalidatePath).toHaveBeenCalledWith('/templates');
        });

        it('returns error if supabase insert fails', async () => {
            mockSupabase.auth.getUser.mockResolvedValue({ data: { user: mockUser } });
            mockQueryBuilder.then.mockImplementationOnce((cb: any) => Promise.resolve(cb({ data: null, error: { message: 'DB Error' } })));

            const formData = new FormData();
            formData.append('title', 'Test Title');
            formData.append('content', 'Test content');

            const result = await createTemplate(formData);
            expect(result).toEqual({ error: 'DB Error' });
        });

        it('returns error if title is missing', async () => {
            mockSupabase.auth.getUser.mockResolvedValue({ data: { user: mockUser } });
            const formData = new FormData();
            formData.append('content', 'Some content');

            const result = await createTemplate(formData);

            expect(result).toEqual({ error: 'Title is required' });
        });
    });

    describe('updateTemplate', () => {
        it('updates a template successfully', async () => {
            mockUser.id = 'user-123';
            mockSupabase.auth.getUser.mockResolvedValue({ data: { user: mockUser } });

            const formData = new FormData();
            formData.append('title', 'Updated Template');
            formData.append('content', 'Updated content');

            const result = await updateTemplate('template-123', formData);

            expect(result).toEqual({ success: true });
            expect(mockSupabase.from).toHaveBeenCalledWith('templates');
            expect(mockQueryBuilder.update).toHaveBeenCalledWith({
                title: 'Updated Template',
                content: 'Updated content',
            });
            expect(mockQueryBuilder.eq).toHaveBeenCalledWith('id', 'template-123');
            expect(mockQueryBuilder.eq).toHaveBeenCalledWith('user_id', mockUser.id);
            expect(revalidatePath).toHaveBeenCalledWith('/templates');
        });
    });

    describe('deleteTemplate', () => {
        it('deletes a template successfully', async () => {
            mockSupabase.auth.getUser.mockResolvedValue({ data: { user: mockUser } });

            const result = await deleteTemplate('template-123');

            expect(result).toEqual({ success: true });
            expect(mockSupabase.from).toHaveBeenCalledWith('templates');
            expect(mockQueryBuilder.delete).toHaveBeenCalled();
            expect(mockQueryBuilder.eq).toHaveBeenCalledWith('id', 'template-123');
            expect(mockQueryBuilder.eq).toHaveBeenCalledWith('user_id', mockUser.id);
            expect(revalidatePath).toHaveBeenCalledWith('/templates');
        });
    });
});
