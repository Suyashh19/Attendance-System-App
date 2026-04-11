import React, { useState, memo } from 'react';
import { View, Text, Modal, TextInput, TouchableOpacity } from 'react-native';
import { Button } from './Button';
import { enrollInSubject } from '../services/attendance';

interface EnrollModalProps {
 visible: boolean;
 onClose: () => void;
 onSuccess: () => void;
}

export const EnrollModal = memo(({ visible, onClose, onSuccess }: EnrollModalProps) => {
 const [enrollCode, setEnrollCode] = useState('');
 const [loading, setLoading] = useState(false);

 const handleEnroll = async () => {
 if (!enrollCode.trim()) return;
 try {
 setLoading(true);
 await enrollInSubject(enrollCode.trim().toUpperCase());
 onSuccess();
 setEnrollCode('');
 } catch (err: any) {
 console.error('[EnrollModal] Error:', err);
 } finally {
 setLoading(false);
 }
 };

 return (
 <Modal visible={visible} animationType="fade" transparent>
 <View className="flex-1 bg-black/60 justify-center p-6">
 <View className="bg-light-card shadow-sm rounded-3xl p-6 border border-light-border">
 <Text className="text-xl font-bold text-light-text mb-4">Enroll in Class</Text>
 <Text className="text-light-muted mb-4">Enter the subject code provided by your faculty.</Text>
 <TextInput
 placeholder="Enter Code (e.g. IT101)"
 placeholderTextColor="#6B7280"
 className="bg-light p-4 rounded-xl text-light-text mb-6 border border-light-border text-center text-lg font-bold"
 value={enrollCode}
 onChangeText={setEnrollCode}
 autoCapitalize="characters"
 />
 <View className="flex-row">
 <TouchableOpacity 
 onPress={onClose}
 className="flex-1 items-center p-4"
 disabled={loading}
 >
 <Text className="text-light-muted font-bold">Cancel</Text>
 </TouchableOpacity>
 <Button 
 title="Enroll" 
 onPress={handleEnroll} 
 className="flex-1" 
 loading={loading}
 />
 </View>
 </View>
 </View>
 </Modal>
 );
});
