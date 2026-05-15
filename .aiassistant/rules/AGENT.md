---
apply: always
---

# AGENTS.md — Codex Engineering Rules

Bu dosya, projedeki tüm AI ajanlarının (Codex dahil) kod üretirken uyması gereken
mimari, stil ve kalite kurallarını tanımlar.

---

## 1. SOLID PRENSİPLERİ

### S — Single Responsibility Principle
- Her sınıf, fonksiyon ve modül **tek bir sorumluluğa** sahip olmalıdır.
- Bir fonksiyon hem veri çekip hem dönüştürüp hem de UI render etmemelidir.
- Sorumluluklar katmanlara ayrılır: `fetch → transform → render`.

```ts
// ❌ Yanlış
function UserCard() {
  const [user, setUser] = useState(null);
  useEffect(() => {
    fetch('/api/users/1').then(r => r.json()).then(setUser);
  }, []);
  return <div>{user?.name}</div>;
}

// ✅ Doğru
// api/userApi.ts → veriyi çeker
// hooks/useUser.ts → state yönetir
// components/UserCard.tsx → sadece render eder
```

### O — Open/Closed Principle
- Mevcut kod **değiştirilmeden** genişletilebilir olmalıdır.
- Yeni özellikler `if/else` zincirleri yerine strateji, kompozisyon veya
  yeni bileşen/servis eklenerek hayata geçirilir.

```ts
// ❌ Yanlış — her yeni tip için fonksiyon değiştiriliyor
function getIcon(type: string) {
  if (type === 'pdf') return <PdfIcon />;
  if (type === 'doc') return <DocIcon />;
}

// ✅ Doğru — map ile genişletilebilir
const ICON_MAP: Record<string, ReactNode> = {
  pdf: <PdfIcon />,
  doc: <DocIcon />,
};
function getIcon(type: string) { return ICON_MAP[type] ?? <DefaultIcon />; }
```

### L — Liskov Substitution Principle
- Türetilmiş sınıf/bileşen, üst türünün yerine geçebilmelidir.
- Ortak `interface`'i bozmayan alt türler oluştur.
- React'ta: `BaseButton` yerine `PrimaryButton` kullanılabilmeli, props kontratı
  bozulmamalıdır.

### I — Interface Segregation Principle
- Büyük, şişirilmiş `interface` yerine küçük, odaklı tipler tanımla.
- Bir bileşen yalnızca ihtiyaç duyduğu props'u almalıdır.

```ts
// ❌ Yanlış
interface UserProps { name: string; email: string; avatarUrl: string; role: string; bio: string; }

// ✅ Doğru — ayrıştırılmış
interface UserIdentity { name: string; email: string; }
interface UserProfile extends UserIdentity { avatarUrl: string; bio: string; }
```

### D — Dependency Inversion Principle
- Üst katmanlar alt katman **implementasyonuna** değil,
  **soyutlamasına (interface/type)** bağımlı olmalıdır.
- Servisler constructor injection veya context ile enjekte edilir;
  doğrudan `import` ile somut sınıfa bağlanılmaz.

---

## 2. KOD MİMARİSİ

### Klasör Yapısı

```
src/
├── api/                   # Tüm HTTP/Firebase/harici servis çağrıları
│   ├── apiClient.ts       # Axios/fetch base instance, interceptor'lar
│   ├── userApi.ts
│   ├── documentApi.ts
│   └── index.ts           # Tüm api modüllerinin barrel export'u
│
├── components/            # Saf, yeniden kullanılabilir UI bileşenleri
│   ├── ui/                # Atom düzey (Button, Input, Modal…)
│   └── shared/            # Uygulama genelinde paylaşılan bileşenler
│
├── features/              # Özellik bazlı (feature-sliced) modüller
│   └── documents/
│       ├── components/    # Bu feature'a özel bileşenler
│       ├── hooks/         # useDocuments, useUpload…
│       ├── types.ts
│       └── index.ts
│
├── hooks/                 # Genel amaçlı custom hook'lar
├── store/                 # Global state (Redux / Zustand / Context)
├── utils/                 # Saf yardımcı fonksiyonlar (side-effect yok)
├── types/                 # Global TypeScript tipleri / interface'ler
├── constants/             # Sabit değerler, enum'lar, config
└── pages/ (veya app/)     # Route bazlı sayfa bileşenleri
```

### Katman Kuralları

| Katman | İzin Verilen Bağımlılıklar |
|--------|---------------------------|
| `api/` | Yalnızca `utils/`, `types/`, `constants/` |
| `hooks/` | `api/`, `store/`, `utils/`, `types/` |
| `components/` | `hooks/`, `utils/`, `types/`, `constants/`, `components/ui/` |
| `features/` | Tüm alt katmanlar; başka `features/` modülüne **doğrudan** bağlanamaz |
| `pages/` | `features/`, `components/shared/`, `hooks/`, `store/` |

---

## 3. API KATMANI KURALLARI

> **Kural:** Hiçbir bileşen veya hook, `fetch`/`axios`/Firebase SDK'yı
> **doğrudan çağırmaz**. Tüm ağ işlemleri `src/api/` üzerinden yürütülür.

### apiClient.ts — Base Instance

```ts
// src/api/apiClient.ts
import axios from 'axios';

const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
  timeout: 10_000,
});

// Request interceptor — auth token ekleme
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('authToken');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Response interceptor — merkezi hata yönetimi
apiClient.interceptors.response.use(
  (res) => res,
  (error) => {
    if (error.response?.status === 401) {
      // token yenile veya logout
    }
    return Promise.reject(error);
  }
);

export default apiClient;
```

### Örnek API Modülü

```ts
// src/api/documentApi.ts
import apiClient from './apiClient';
import type { Document, UploadPayload } from '@/types';

export const documentApi = {
  getAll: (userId: string) =>
    apiClient.get<Document[]>(`/documents/${userId}`).then((r) => r.data),

  upload: (payload: UploadPayload) =>
    apiClient.post<Document>('/documents', payload).then((r) => r.data),

  delete: (id: string) =>
    apiClient.delete(`/documents/${id}`).then((r) => r.data),
};
```

### Barrel Export

```ts
// src/api/index.ts
export { documentApi } from './documentApi';
export { userApi }     from './userApi';
```

---

## 4. COMPONENT MİMARİSİ

### Bileşen Hiyerarşisi (Atomic Design)

```
Atom       → Button, Input, Badge, Icon
Molecule   → FormField (Label + Input + ErrorMsg)
Organism   → DocumentCard, UserProfileHeader
Template   → PageLayout, DashboardLayout
Page       → DocumentsPage, LoginPage
```

### Bileşen Yazım Kuralları

```tsx
// ✅ Doğru bileşen yapısı
interface DocumentCardProps {
  document: Document;
  onDelete: (id: string) => void;
}

export function DocumentCard({ document, onDelete }: DocumentCardProps) {
  // 1. Hook'lar en üstte
  // 2. Türetilmiş değerler (useMemo/useCallback)
  // 3. Handler fonksiyonları
  // 4. Return — sadece JSX, iş mantığı yok
  return (
    <div className="document-card">
      <h3>{document.title}</h3>
      <DeleteButton onClick={() => onDelete(document.id)} />
    </div>
  );
}
```

- Bileşen dosyaları **200 satırı geçmemelidir**; geçiyorsa alt bileşenlere böl.
- Props drilling 2 seviyeyi aşıyorsa **Context veya global store** kullan.
- Side-effect'ler (`useEffect`) direkt bileşende değil, **custom hook** içinde olmalı.

---

## 5. CUSTOM HOOK KURALLARI

```ts
// src/hooks/useDocuments.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { documentApi } from '@/api';

export function useDocuments(userId: string) {
  const qc = useQueryClient();

  const { data, isLoading, error } = useQuery({
    queryKey: ['documents', userId],
    queryFn: () => documentApi.getAll(userId),
  });

  const deleteMutation = useMutation({
    mutationFn: documentApi.delete,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['documents', userId] }),
  });

  return { documents: data ?? [], isLoading, error, deleteDocument: deleteMutation.mutate };
}
```

- Her hook **tek bir domain** ile ilgilenir.
- Hook'lar bileşenden bağımsız test edilebilir olmalıdır.
- Dönüş değerleri **nesne** olarak döndürülür (sıra bağımlılığı yok).

---

## 6. TİP GÜVENLİĞİ

- Projede **TypeScript strict modu** aktif olmalıdır (`"strict": true`).
- `any` kullanımı **yasaktır**; zorunlu durumlarda `unknown` + type guard tercih edilir.
- API response tipleri `src/types/` altında merkezi olarak tanımlanır.
- Runtime doğrulama için **Zod** veya **Yup** şemaları kullanılır.

```ts
// src/types/document.ts
export interface Document {
  id: string;
  title: string;
  url: string;
  uploadedAt: string;
  ownerId: string;
}

export interface UploadPayload {
  file: File;
  ownerId: string;
}
```

---

## 7. HATA YÖNETİMİ

- API hataları **api katmanında** yakalanır ve anlamlı hata nesnelerine dönüştürülür.
- UI katmanında `try/catch` blokları yerine **React Query** veya **Error Boundary** kullanılır.
- Kullanıcıya gösterilecek hata mesajları `constants/errorMessages.ts` içinde tutulur.

```ts
// src/api/apiClient.ts — merkezi hata dönüşümü
apiClient.interceptors.response.use(
  (res) => res,
  (error) => {
    const message = error.response?.data?.message ?? 'Beklenmeyen bir hata oluştu.';
    return Promise.reject(new Error(message));
  }
);
```

---

## 8. GENEL KOD KALİTE KURALLARI

### Adlandırma
| Öğe | Kural | Örnek |
|-----|-------|-------|
| Bileşen | PascalCase | `DocumentCard` |
| Hook | camelCase + `use` prefix | `useDocuments` |
| API modülü | camelCase + `Api` suffix | `documentApi` |
| Tip/Interface | PascalCase | `Document`, `UploadPayload` |
| Sabit | SCREAMING_SNAKE_CASE | `MAX_FILE_SIZE` |
| Utils fonksiyonu | camelCase, fiil ile başlar | `formatDate`, `parseError` |

### Fonksiyon Kuralları
- Fonksiyon gövdesi **50 satırı geçmemelidir**.
- Parametre sayısı **3'ü geçmemelidir**; geçiyorsa nesne ile sarılır.
- Pure fonksiyonlar tercih edilir; side-effect açıkça belirtilir.

### Import Sırası
```ts
// 1. Node/React çekirdek modülleri
import { useState } from 'react';
// 2. Üçüncü parti kütüphaneler
import axios from 'axios';
// 3. İç modüller (path alias ile)
import { documentApi } from '@/api';
import type { Document } from '@/types';
// 4. Stil dosyaları
import './DocumentCard.css';
```

### Yasaklı Pratikler
- ❌ Bileşen içinde doğrudan `fetch` / `axios` çağrısı
- ❌ `any` tipi kullanımı
- ❌ 3 seviyeden derin props drilling
- ❌ Magic number / string (sabitler `constants/` altında olmalı)
- ❌ `console.log` commit'e girmemeli (linter kuralıyla engellenir)
- ❌ Tek dosyada birden fazla sorumluluk

---

## 9. TEST STRATEJİSİ

- **Unit test**: Utils fonksiyonları ve custom hook'lar (Vitest / Jest)
- **Integration test**: API modülleri mock server ile (MSW)
- **Component test**: React Testing Library ile davranış testleri
- **E2E**: Kritik kullanıcı akışları (Playwright / Cypress)

```
Her yeni feature için minimum:
  ✅ 1 happy-path integration testi
  ✅ 1 error-state component testi
  ✅ Utils fonksiyonları için unit testler
```

---

## 10. GIT & COMMIT KURALLARI

Conventional Commits formatı zorunludur:

```
feat(documents): add file upload with progress indicator
fix(api): handle 401 token refresh in interceptor
refactor(components): extract DocumentCard into feature module
test(hooks): add useDocuments error state coverage
chore(deps): upgrade axios to 1.7.0
```

---

*Bu dosya projenin kök dizininde `AGENTS.md` olarak yer almalı ve
tüm katkıda bulunanlar (insan & AI) tarafından takip edilmelidir.*