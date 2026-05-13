import {
  getFirestore,
  collection,
  addDoc,
  getDocs,
  deleteDoc,
  doc,
  query,
  orderBy,
  Timestamp,
} from "firebase/firestore";
import {
  getStorage,
  ref,
  uploadBytesResumable,
  getDownloadURL,
  deleteObject,
} from "firebase/storage";
import { app } from "./firebase.config";
import type { IDocument } from "../components/docs/types";

const db = getFirestore(app);
const storage = getStorage(app);

/**
 * Upload a file to Firebase Storage and save its metadata to Firestore.
 * Returns the created IDocument.
 */
export async function uploadDocument(
  uid: string,
  file: File,
  onProgress?: (progress: number) => void
): Promise<IDocument> {
  const storagePath = `documents/${uid}/${Date.now()}_${file.name}`;
  const storageRef = ref(storage, storagePath);

  // Upload with progress tracking
  await new Promise<void>((resolve, reject) => {
    const task = uploadBytesResumable(storageRef, file);
    task.on(
      "state_changed",
      (snap) => {
        const pct = Math.round((snap.bytesTransferred / snap.totalBytes) * 100);
        onProgress?.(pct);
      },
      reject,
      () => resolve()
    );
  });

  const url = await getDownloadURL(storageRef);

  const docData = {
    name: file.name,
    size: file.size,
    url,
    storagePath,
    createdAt: Timestamp.now(),
  };

  const colRef = collection(db, "users", uid, "documents");
  const docRef = await addDoc(colRef, docData);

  return {
    id: docRef.id,
    name: file.name,
    size: file.size,
    url,
    storagePath,
    createdAt: new Date().toLocaleDateString("tr-TR", {
      year: "numeric",
      month: "short",
      day: "numeric",
    }),
  };
}

/**
 * Fetch all documents for a user from Firestore, ordered by createdAt desc.
 */
export async function fetchDocuments(uid: string): Promise<IDocument[]> {
  const colRef = collection(db, "users", uid, "documents");
  const q = query(colRef, orderBy("createdAt", "desc"));
  const snap = await getDocs(q);

  return snap.docs.map((d) => {
    const data = d.data() as {
      name: string;
      size: number;
      url: string;
      storagePath: string;
      createdAt: Timestamp;
    };

    return {
      id: d.id,
      name: data.name,
      size: data.size,
      url: data.url,
      storagePath: data.storagePath,
      createdAt: data.createdAt?.toDate().toLocaleDateString("tr-TR", {
        year: "numeric",
        month: "short",
        day: "numeric",
      }) ?? "",
    };
  });
}

/**
 * Delete a document from both Firestore and Firebase Storage.
 */
export async function deleteDocument(
  uid: string,
  documentId: string,
  storagePath: string
): Promise<void> {
  // Delete Firestore record
  await deleteDoc(doc(db, "users", uid, "documents", documentId));

  // Delete file from Storage
  const storageRef = ref(storage, storagePath);
  await deleteObject(storageRef);
}
