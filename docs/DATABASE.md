# Data model

```mermaid
erDiagram
    USER ||--o{ COURSE : "instructs"
    USER ||--o{ ENROLLMENT : "enrolls"
    COURSE ||--o{ ENROLLMENT : "has"
    USER ||--o{ AUDITLOG : "performs"
    USER ||--o{ USER : "createdBy (admins)"

    USER {
        string name
        string username UK "lowercase"
        string email UK "lowercase"
        string passwordHash "bcrypt(12), select:false"
        string role "student|instructor|admin|superadmin"
        string status "active|pending|suspended"
        number tokenVersion "bumped to revoke JWTs"
        objectId createdBy FK
    }
    COURSE {
        string title
        string description
        string category
        string level "beginner|intermediate|advanced"
        array content "[{ title, body }]"
        objectId instructor FK
        string status "draft|published|archived"
        number enrollmentCount "denormalized"
    }
    ENROLLMENT {
        objectId student FK
        objectId course FK
        string status "active|completed"
        date enrolledAt
        date completedAt
    }
    AUDITLOG {
        objectId actor FK
        string actorUsername "snapshot"
        string action
        string targetType "User|Course"
        objectId targetId
        object metadata
        string ip
    }
```

## Indexes and why each exists

| Collection  | Index                                                     | Purpose                                                                                        |
| ----------- | --------------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| users       | `username` unique, `email` unique                         | Login lookup; no duplicate accounts (values are lowercased first)                              |
| users       | `{ role: 1 }` **unique, partial** on `role: 'superadmin'` | MongoDB itself guarantees there is exactly one super admin, even if application code has a bug |
| users       | `role`, `status`                                          | Admin user filters, pending-instructor queue                                                   |
| courses     | `instructor`                                              | "My courses"                                                                                   |
| courses     | `category`, `status`                                      | Catalog filters; public list only shows `published`                                            |
| courses     | text index on `title` (weight 3) + `description`          | `?search=` without extra infrastructure                                                        |
| enrollments | `{ student: 1, course: 1 }` **unique**                    | Duplicate enrollment is impossible, even for two simultaneous requests (tested)                |
| enrollments | `student`, `course`                                       | "My enrollments" and "students in this course"                                                 |
| auditlogs   | `actor`, `action`, `createdAt: -1`                        | Filtered, newest-first audit screen                                                            |

## Modelling decisions

- **Enrollment is its own collection**, not an array on User or Course. Arrays grow without bound
  (16 MB document limit) and can only be indexed from one side; a join collection is indexed in
  both directions and carries its own status and dates.
- **`enrollmentCount` is denormalized** onto Course and incremented with `$inc` on enrollment, so
  course lists don't run a count query per course.
- **Hard deletes cascade in a transaction.** Deleting a course removes its enrollments in the same
  MongoDB transaction, so no orphans remain. `archived` is the soft alternative and is what the UI
  suggests when a course has students.
- **Audit entries snapshot the actor's username**, so the log stays readable after an admin
  account is removed.
