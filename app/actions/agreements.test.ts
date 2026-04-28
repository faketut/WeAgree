import { createDraftAgreement } from "./agreements";
import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

jest.mock("@/lib/supabase/server");
jest.mock("next/cache");

describe("agreements server actions", () => {
  const mockUser = { id: "user-123", email: "test@example.com" };
  let singleCall = 0;

  const mockSupabase: any = {};
  mockSupabase.auth = { getUser: jest.fn() };
  mockSupabase.from = jest.fn(() => mockSupabase);
  mockSupabase.upsert = jest.fn().mockReturnThis();
  mockSupabase.insert = jest.fn().mockReturnThis();
  mockSupabase.update = jest.fn().mockReturnThis();
  mockSupabase.delete = jest.fn().mockReturnThis();
  mockSupabase.select = jest.fn().mockReturnThis();
  mockSupabase.eq = jest.fn().mockReturnThis();
  mockSupabase.single = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    singleCall = 0;
    (createClient as jest.Mock).mockResolvedValue(mockSupabase);
    mockSupabase.single.mockImplementation(() => {
      singleCall += 1;
      if (singleCall === 1) {
        return Promise.resolve({ data: { id: "agreement-456" }, error: null });
      }
      return Promise.resolve({ data: { id: "version-789" }, error: null });
    });
    mockSupabase.update.mockReturnValue({
      eq: jest.fn().mockResolvedValue({ error: null }),
    });
  });

  describe("createDraftAgreement", () => {
    it("returns error if not authenticated", async () => {
      mockSupabase.auth.getUser.mockResolvedValue({ data: { user: null } });
      const formData = new FormData();

      const result = await createDraftAgreement(formData);

      expect(result).toEqual({ error: "Not authenticated" });
    });

    it("creates a draft agreement and version successfully", async () => {
      mockSupabase.auth.getUser.mockResolvedValue({ data: { user: mockUser } });
      const formData = new FormData();
      formData.append("title", "Test Agreement");
      formData.append("content", "Hello {{signature}} world");

      const result = await createDraftAgreement(formData);

      expect(result).toEqual({ success: true, id: "agreement-456" });
      expect(mockSupabase.from).toHaveBeenCalledWith("agreements");
      expect(mockSupabase.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          title: "Test Agreement",
          content: "Hello {{signature}} world",
          status: "draft",
        })
      );
      expect(revalidatePath).toHaveBeenCalledWith("/dashboard");
    });

    it("returns error if title is missing", async () => {
      mockSupabase.auth.getUser.mockResolvedValue({ data: { user: mockUser } });
      const formData = new FormData();
      formData.append("content", "Some {{signature}} content");

      const result = await createDraftAgreement(formData);

      expect(result).toEqual({ error: "Title is required" });
    });
  });
});
