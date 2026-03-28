import { Paths, File } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import * as SecureStore from 'expo-secure-store';
import api from './api';
import { Platform } from 'react-native';

export interface ExportFilters {
  startDate?: string;
  endDate?: string;
  sessionIds?: number[];
}

/**
 * Downloads attendance data as Excel and triggers sharing/save dialog.
 */
export async function exportAttendanceData(subjectId: string | number, filters: ExportFilters = {}) {
  try {
    const queryParams = new URLSearchParams();
    if (filters.startDate) queryParams.append('startDate', filters.startDate);
    if (filters.endDate) queryParams.append('endDate', filters.endDate);
    if (filters.sessionIds && filters.sessionIds.length > 0) {
      queryParams.append('sessionIds', filters.sessionIds.join(','));
    }

    const url = `/analytics/export/${subjectId}?${queryParams.toString()}`;
    
    // For mobile, we use Expo FileSystem to download the binary
    if (Platform.OS !== 'web') {
      const fileName = `attendance_subject_${subjectId}_${Date.now()}.xlsx`;
      
      // Get the token from SecureStore since we're using raw FileSystem download
      const token = await SecureStore.getItemAsync('auth_token');
      
      // NEW API: Using Paths.document and File.downloadFileAsync
      const destination = new File(Paths.document, fileName);
      
      const file = await File.downloadFileAsync(
        `${api.defaults.baseURL}${url}`,
        destination,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        }
      );

      const uri = file.uri;

      // Check if sharing is available
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, {
          mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          dialogTitle: 'Download Attendance Report',
          UTI: 'com.microsoft.excel.xlsx',
        });
      } else {
        throw new Error('Sharing is not available on this device');
      }
      
      return uri;
    } else {
      // Web fallback (if needed)
      const response = await api.get(url, { responseType: 'blob' });
      const blobUrl = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = blobUrl;
      link.setAttribute('download', `attendance_${subjectId}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    }
  } catch (error) {
    console.error('[ERROR] Failed to export attendance:', error);
    throw error;
  }
}
