import { GoogleGenAI, Type } from "@google/genai";
import { TravelPlan, UserPreferences, VideoSummary, SuggestedActivity, DayItinerary, UserReview } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

const VIDEO_SUMMARY_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    scenes: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          title: { type: Type.STRING },
          description: { type: Type.STRING },
          imagePrompt: { type: Type.STRING },
        },
        required: ["title", "description", "imagePrompt"],
      },
    },
  },
  required: ["scenes"],
};

function handleGeminiError(error: any): never {
  console.error("Gemini API Error Detail:", JSON.stringify(error, null, 2));
  
  // Extract error info from various possible formats
  const errorCode = error?.status === "RESOURCE_EXHAUSTED" || error?.code === 429 
    ? 429 
    : (error?.error?.code === 429 || error?.error?.status === "RESOURCE_EXHAUSTED" ? 429 : null);
  
  const errorMessage = typeof error?.message === 'string' ? error.message : "";
  const innerErrorMessage = typeof error?.error?.message === 'string' ? error.error.message : "";

  // Check if it's a quota error (429)
  const isQuotaError = 
    errorCode === 429 || 
    errorMessage.toLowerCase().includes("quota") || 
    errorMessage.toLowerCase().includes("resource_exhausted") ||
    innerErrorMessage.toLowerCase().includes("quota") ||
    innerErrorMessage.toLowerCase().includes("resource_exhausted");

  if (isQuotaError) {
    throw new Error("Hệ thống AI đang quá tải hoặc đã hết hạn mức (quota) cho hôm nay. Vui lòng thử lại sau vài phút hoặc quay lại vào ngày mai.");
  }

  // Handle other common errors or rethrow
  if (error instanceof Error) throw error;
  throw new Error(innerErrorMessage || errorMessage || "Đã xảy ra lỗi khi kết nối với AI. Vui lòng thử lại.");
}

export async function generateVideoSummary(plan: TravelPlan): Promise<VideoSummary> {
  const prompt = `
    Dựa trên kế hoạch du lịch "${plan.tourName}", hãy tạo một kịch bản video tóm tắt hành trình gồm 4-5 cảnh (scenes).
    Mỗi cảnh cần có:
    1. Tiêu đề (title): Ngắn gọn, hấp dẫn.
    2. Mô tả (description): Nội dung tóm tắt cho cảnh đó (1-2 câu).
    3. Gợi ý hình ảnh (imagePrompt): Một mô tả tiếng Anh chi tiết để tạo hình ảnh minh họa bằng AI (ví dụ: "A cinematic shot of...") phản ánh nội dung cảnh đó.

    Hành trình tóm tắt:
    ${plan.story}
    Lịch trình: ${plan.itinerary.map(d => `Ngày ${d.day}: ${d.morning.activity}, ${d.afternoon.activity}, ${d.evening.activity}`).join('; ')}

    Hãy tạo kịch bản này bằng tiếng Việt (trừ phần imagePrompt).
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: VIDEO_SUMMARY_SCHEMA as any,
      },
    });

    if (!response.text) {
      throw new Error("No response from Gemini");
    }

    return JSON.parse(response.text) as VideoSummary;
  } catch (error) {
    handleGeminiError(error);
  }
}

const RESPONSE_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    tourName: { type: Type.STRING },
    story: { type: Type.STRING },
    itinerary: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          day: { type: Type.INTEGER },
          morning: {
            type: Type.OBJECT,
            properties: {
              activity: { type: Type.STRING },
              location: { type: Type.STRING },
              lat: { type: Type.NUMBER },
              lng: { type: Type.NUMBER },
              cost: { type: Type.NUMBER },
              category: { type: Type.STRING, enum: ["Ăn uống", "Tham quan", "Di chuyển", "Lưu trú", "Khác"] },
              description: { type: Type.STRING },
              rating: { type: Type.NUMBER },
              reviewCount: { type: Type.INTEGER },
              openingHours: { type: Type.STRING },
              images: {
                type: Type.ARRAY,
                items: { type: Type.STRING }
              },
            },
            required: ["activity", "location", "lat", "lng", "cost", "category", "description", "rating", "reviewCount", "openingHours", "images"]
          },
          afternoon: {
            type: Type.OBJECT,
            properties: {
              activity: { type: Type.STRING },
              location: { type: Type.STRING },
              lat: { type: Type.NUMBER },
              lng: { type: Type.NUMBER },
              cost: { type: Type.NUMBER },
              category: { type: Type.STRING, enum: ["Ăn uống", "Tham quan", "Di chuyển", "Lưu trú", "Khác"] },
              description: { type: Type.STRING },
              rating: { type: Type.NUMBER },
              reviewCount: { type: Type.INTEGER },
              openingHours: { type: Type.STRING },
              images: {
                type: Type.ARRAY,
                items: { type: Type.STRING }
              },
            },
            required: ["activity", "location", "lat", "lng", "cost", "category", "description", "rating", "reviewCount", "openingHours", "images"]
          },
          evening: {
            type: Type.OBJECT,
            properties: {
              activity: { type: Type.STRING },
              location: { type: Type.STRING },
              lat: { type: Type.NUMBER },
              lng: { type: Type.NUMBER },
              cost: { type: Type.NUMBER },
              category: { type: Type.STRING, enum: ["Ăn uống", "Tham quan", "Di chuyển", "Lưu trú", "Khác"] },
              description: { type: Type.STRING },
              rating: { type: Type.NUMBER },
              reviewCount: { type: Type.INTEGER },
              openingHours: { type: Type.STRING },
              images: {
                type: Type.ARRAY,
                items: { type: Type.STRING }
              },
            },
            required: ["activity", "location", "lat", "lng", "cost", "category", "description", "rating", "reviewCount", "openingHours", "images"]
          },
          totalDayCost: { type: Type.NUMBER },
          preview360Url: { type: Type.STRING },
          logic: { type: Type.STRING },
        },
        required: ["day", "morning", "afternoon", "evening", "totalDayCost", "logic"]
      }
    },
    mapPoints: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          name: { type: Type.STRING },
          lat: { type: Type.NUMBER },
          lng: { type: Type.NUMBER },
          type: { type: Type.STRING },
          description: { type: Type.STRING },
          streetViewUrl: { type: Type.STRING },
          rating: { type: Type.NUMBER },
          reviewCount: { type: Type.INTEGER },
          openingHours: { type: Type.STRING },
          images: {
            type: Type.ARRAY,
            items: { type: Type.STRING }
          },
        },
        required: ["name", "lat", "lng", "type", "description", "rating", "reviewCount", "openingHours", "images"]
      }
    },
    totalEstimatedCost: { type: Type.NUMBER },
    budgetAnalysis: { type: Type.STRING },
    personalizationLogic: { type: Type.STRING },
    aiInsight: { type: Type.STRING },
  },
  required: ["tourName", "story", "itinerary", "mapPoints", "totalEstimatedCost", "budgetAnalysis", "personalizationLogic", "aiInsight"]
};

export async function generateTravelPlan(prefs: UserPreferences): Promise<TravelPlan> {
  const prompt = `
    Tạo một kế hoạch du lịch chi tiết bằng tiếng VIỆT dựa trên các thông tin sau:
    - Ngân sách: ${prefs.budget.toLocaleString('vi-VN')} VNĐ
    - Thời gian: ${prefs.duration} ngày
    - Số người đi: ${prefs.travelers} người
    - Điểm khởi đầu: ${prefs.startLocation}
    - Danh sách điểm muốn đến (wishlist - CẦN ƯU TIÊN): ${prefs.wishlist.join(", ")}
    - Sở thích: ${prefs.interests.join(", ")}
    - Tâm trạng: ${prefs.mood}

    Kế hoạch phải bao gồm:
    1. Một "tour name" (tên chuyến đi) bắt tai bằng tiếng Việt phản ánh đúng tâm trạng.
    2. Một đoạn mô tả ngắn (story) dạng kể chuyện (2-3 đoạn văn) về hành trình. Hãy nhắc đến các địa điểm trong wishlist nếu có thể.
    3. Lịch trình chi tiết từng ngày với các mốc Sáng, Chiều, Tối. Cố gắng đưa các địa điểm trong wishlist vào lịch trình một cách hợp lý. Mỗi hoạt động PHẢI có một 'category' (Ăn uống, Tham quan, Di chuyển, Lưu trú, Khác).
    4. Chi phí ước tính cho mỗi hoạt động cho TẤT CẢ ${prefs.travelers} người (Đơn vị: VNĐ).
    5. Danh sách các điểm trên bản đồ (lộ trình tối ưu) cho các điểm tham quan, nhà hàng và khách sạn.
    6. Kinh độ (lng) và Vĩ độ (lat) cụ thể cho MỖI hoạt động và điểm bản đồ.
    7. Cho 'preview360Url' trong mỗi hoạt động (morning, afternoon, evening) và mapPoints, cung cấp URL nhúng Google Maps Street View (svembed) sử dụng lat/lng của chính hoạt động hoặc địa điểm đó.
       Định dạng: https://www.google.com/maps?q=&layer=c&cbll=LAT,LNG&cbp=11,0,0,0,0&output=svembed
    8. Giải thích lý do (personalizationLogic) tại sao lại chọn các địa điểm cụ thể đó bằng tiếng Việt.
    9. Phân tích ngân sách (budgetAnalysis) cho thấy cách kế hoạch duy trì trong giới hạn ${prefs.budget.toLocaleString('vi-VN')} VNĐ cho ${prefs.travelers} người.
    10. Cung cấp điểm đánh giá (rating - từ 1.0 đến 5.0) và số lượng đánh giá (reviewCount) giả lập thực tế cho mỗi địa điểm/hoạt động.
    11. Cung cấp giờ mở cửa (openingHours) thực tế hoặc giả lập (ví dụ: "08:00 - 22:00") cho mỗi địa điểm.
    12. Cung cấp 2-3 URL hình ảnh (images) thực tế từ Unsplash hoặc các nguồn mở cho mỗi địa điểm (ví dụ: "https://images.unsplash.com/photo-XXX?auto=format&fit=crop&w=800&q=80").
    13. Một câu "aiInsight" (tiếng Việt) ngắn gọn, sắc sảo về ưu điểm cốt lõi của hành trình này (ví dụ: "Sự kết hợp hoàn hảo giữa lịch sử và ẩm thực đường phố, tiết kiệm 15% chi phí đi lại nhờ lộ trình tối ưu").

    Hãy thực tế và cụ thể. Đảm bảo tọa độ chính xác cho các địa điểm được đề cập. Tất cả văn bản phải bằng tiếng Việt. Chi phí phải thực tế với mệnh giá VNĐ.
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: RESPONSE_SCHEMA as any,
      },
    });

    if (!response.text) {
      throw new Error("No response from Gemini");
    }

    return JSON.parse(response.text) as TravelPlan;
  } catch (error) {
    handleGeminiError(error);
  }
}

const SUGGESTIONS_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    suggestions: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          name: { type: Type.STRING },
          type: { type: Type.STRING, enum: ["attraction", "dining"] },
          description: { type: Type.STRING },
          reason: { type: Type.STRING },
          lat: { type: Type.NUMBER },
          lng: { type: Type.NUMBER },
        },
        required: ["name", "type", "description", "reason", "lat", "lng"],
      },
    },
  },
  required: ["suggestions"],
};

export async function generateSuggestedActivities(
  dayPlan: DayItinerary,
  prefs: UserPreferences
): Promise<SuggestedActivity[]> {
  const prompt = `
    Dựa trên lịch trình ngày ${dayPlan.day} của chuyến đi và sở thích của người dùng:
    - Các hoạt động chính trong ngày: ${dayPlan.morning.activity}, ${dayPlan.afternoon.activity}, ${dayPlan.evening.activity}
    - Địa điểm: ${dayPlan.morning.location}, ${dayPlan.afternoon.location}, ${dayPlan.evening.location}
    - Sở thích người dùng: ${prefs.interests.join(", ")}
    - Tâm trạng: ${prefs.mood}

    Hãy đề xuất thêm 3 địa điểm THAM QUAN (attraction) hoặc ĂN UỐNG (dining) gần các khu vực này mà người dùng có thể quan tâm.
    Yêu cầu:
    1. Địa điểm phải gần tọa độ của các hoạt động chính (Morning: ${dayPlan.morning.lat}, ${dayPlan.morning.lng}).
    2. Đề xuất phải bằng tiếng Việt.
    3. Giải thích lý do (reason) tại sao người dùng nên ghé thăm dựa trên sở thích và hành trình hiện tại.
    4. Cung cấp tọa độ lat/lng chính xác.
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: SUGGESTIONS_SCHEMA as any,
      },
    });

    if (!response.text) {
      throw new Error("No response from Gemini");
    }

    const data = JSON.parse(response.text);
    return data.suggestions as SuggestedActivity[];
  } catch (error) {
    try {
      handleGeminiError(error);
    } catch (e) {
      console.error("Error generating suggested activities:", e);
    }
    return [];
  }
}

export async function generateNearbyActivities(
  activity: { activity: string, location: string, lat: number, lng: number, description: string },
  prefs: UserPreferences
): Promise<SuggestedActivity[]> {
  const prompt = `
    Người dùng đang xem chi tiết về hoạt động: "${activity.activity}" tại "${activity.location}".
    Mô tả hoạt động: "${activity.description}"
    Tọa độ: ${activity.lat}, ${activity.lng}
    Sở thích người dùng: ${prefs.interests.join(", ")}
    Tâm trạng: ${prefs.mood}

    Hãy đề xuất thêm 3 địa điểm THAM QUAN (attraction) hoặc ĂN UỐNG (dining) tương tự hoặc nằm rất gần địa điểm này.
    Yêu cầu:
    1. Đề xuất phải bằng tiếng Việt.
    2. Giải thích lý do (reason) tại sao gợi ý này phù hợp với hoạt động hiện tại và sở thích người dùng.
    3. Cung cấp tọa độ lat/lng chính xác (gần ${activity.lat}, ${activity.lng}).
    4. Cung cấp mô tả ngắn gọn cho mỗi địa điểm.
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: SUGGESTIONS_SCHEMA as any,
      },
    });

    if (!response.text) {
      throw new Error("No response from Gemini");
    }

    const data = JSON.parse(response.text);
    return data.suggestions as SuggestedActivity[];
  } catch (error) {
    console.error("Error generating nearby activities:", error);
    return [];
  }
}

export async function generateActivityReviews(
  activity: string,
  location: string
): Promise<UserReview[]> {
  const prompt = `
    Tạo 3 đánh giá giả lập từ người dùng thực tế cho địa điểm: "${activity}" tại "${location}".
    Mỗi đánh giá cần có:
    1. rating (từ 4 đến 5)
    2. comment (tiếng Việt, thể hiện sự sang trọng, hài lòng, chi tiết về trải nghiệm)
    3. createdAt (ngày tháng năm ngẫu nhiên trong 6 tháng qua, định dạng ISO)

    Trả về danh sách 3 đối tượng trong mảng "reviews".
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: "object",
          properties: {
            reviews: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  rating: { type: "number" },
                  comment: { type: "string" },
                  createdAt: { type: "string" }
                },
                required: ["rating", "comment", "createdAt"]
              }
            }
          },
          required: ["reviews"]
        } as any,
      },
    });

    if (!response.text) return [];
    const data = JSON.parse(response.text);
    return data.reviews || [];
  } catch (error) {
    console.error("Error generating reviews:", error);
    return [];
  }
}
