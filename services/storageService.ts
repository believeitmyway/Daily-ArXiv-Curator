
import { Paper, Topic } from "../types";
import { dbRepository } from "./db";

// --- Topics ---
export const getStoredTopics = async (): Promise<Topic[]> => {
  try {
    return await dbRepository.topics.getAll();
  } catch (e) {
    console.error("Failed to load topics from DB", e);
    return [];
  }
};

export const saveTopics = async (topics: Topic[]) => {
  try {
    // IndexedDB's putBulk is efficient, handling inserts and updates
    await dbRepository.topics.saveAll(topics);
  } catch (e) {
    console.error("Failed to save topics to DB", e);
  }
};

export const deleteTopic = async (topicId: string) => {
    try {
        await dbRepository.topics.delete(topicId);
    } catch(e) {
        console.error("Failed to delete topic", e);
    }
}

// --- Papers ---
export const getStoredPapers = async (): Promise<Paper[]> => {
  try {
    return await dbRepository.papers.getAll();
  } catch (e) {
    console.error("Failed to load papers from DB", e);
    return [];
  }
};

export const savePapers = async (papers: Paper[]) => {
  try {
    await dbRepository.papers.saveAll(papers);
  } catch (e) {
    console.error("Failed to save papers to DB", e);
  }
};

export const deletePaper = async (paperId: string) => {
    try {
        await dbRepository.papers.delete(paperId);
    } catch(e) {
        console.error("Failed to delete paper", e);
    }
}

// --- Utilities ---
export const mergePapers = (existing: Paper[], incoming: Paper[]): Paper[] => {
  const map = new Map<string, Paper>();
  
  existing.forEach(p => map.set(p.id, p));
  // Overwrite or add new
  incoming.forEach(p => map.set(p.id, p));

  return Array.from(map.values()).sort((a, b) => 
    new Date(b.publishedDate).getTime() - new Date(a.publishedDate).getTime()
  );
};
