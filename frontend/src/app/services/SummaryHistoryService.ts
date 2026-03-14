import { Injectable } from '@angular/core';

export interface SummaryRecord {
  id: string;
  text: string;
  summary: string;
  date: Date;
}

@Injectable({
  providedIn: 'root'
})
export class SummaryHistoryService {
  private history: SummaryRecord[] = [];

  getHistory(): SummaryRecord[] {
    return this.history;
  }

  addRecord(record: SummaryRecord) {
    this.history.push(record);
  }
}
