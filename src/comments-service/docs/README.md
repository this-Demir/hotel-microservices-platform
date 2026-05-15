# comments-service

Stores and retrieves user comments and ratings for hotels. Exclusively uses MongoDB Atlas.

---

## Responsibility

- Accept comment submissions from authenticated users
- Return paginated comments + rating distributions for a given hotel
- No other service reads from or writes to MongoDB

---

## API Endpoints

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/api/v1/comments/{hotelId}` | No | Get comments for a hotel (paginated) |
| POST | `/api/v1/comments` | Yes | Submit a comment with ratings |

---

## Data

MongoDB Atlas collection `HotelComments`. Schema:

```json
{
  "_id": "ObjectId",
  "hotelId": "UUID",
  "userId": "Cognito sub",
  "travelDate": "ISODate",
  "overallRating": 8.5,
  "categoryRatings": {
    "cleanliness": 9.0,
    "staff": 8.0,
    "facilities": 8.5,
    "ecoFriendly": 8.5
  },
  "commentText": "...",
  "adminReply": null,
  "createdAt": "ISODate"
}
```

The frontend renders a distribution chart per category from the paginated response.

---

## Dependencies

| Dependency | Purpose |
|---|---|
| MongoDB Atlas | Sole data store — no Supabase connection |
| AWS Cognito JWKS | JWT validation for POST endpoint |

---

## Configuration

| Key | Notes |
|---|---|
| `ConnectionStrings:MongoDB` | MongoDB Atlas connection string (`mongodb+srv://...`) |
| `Cognito:Authority` | Cognito user pool URL |

---

## Implementation Plan

1. **Done** — `HotelComment` model, `CommentDtos`, `ICommentService`, `CommentsController`
2. **Done** — `IMongoClient` + JWT Bearer wired in `Program.cs`
3. **Next** — `CommentService`: implement `CreateAsync` (insert document, map to DTO) and `GetByHotelAsync` (filter by `hotelId`, sort by `createdAt` desc, paginate with skip/limit)
4. **Next** — Register `CommentService` in `Program.cs`
5. **Next** — Create MongoDB index on `hotelId` for query performance
