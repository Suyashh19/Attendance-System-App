import React, { useState, memo } from 'react';
import { View, Text, Modal, TextInput, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Button } from './Button';
import { createSubject } from '../services/attendance';

interface CreateSubjectModalProps {
 visible: boolean;
 onClose: () => void;
 onSuccess: (subjectType: 'theory' | 'practical') => void;
}

export const CreateSubjectModal = memo(({ visible, onClose, onSuccess }: CreateSubjectModalProps) => {
 const [newSubject, setNewSubject] = useState({ 
 name: '', 
 code: '', 
 type: 'theory' as 'theory' | 'practical' 
 });
 const [loading, setLoading] = useState(false);

 const handleCreate = async () => {
 if (!newSubject.name || !newSubject.code) return;
 try {
 setLoading(true);
 await createSubject(newSubject.name, newSubject.code, newSubject.type);
 onSuccess(newSubject.type);
 setNewSubject({ name: '', code: '', type: 'theory' });
 } catch (err: any) {
 console.error('[CreateSubjectModal] Error:', err);
 // We let the caller handle severe alerts if needed, 
 // but usually an alert here is fine.
 } finally {
 setLoading(false);
 }
 };

 return (
 <Modal visible={visible} animationType="fade" transparent>
 <View className="flex-1 bg-black/60 justify-center p-6">
 <View className="bg-light-card shadow-sm rounded-3xl p-6 border border-light-border">
 <Text className="text-xl font-bold text-light-text mb-4">Create New Subject</Text>
 <TextInput
 placeholder="Subject Name (e.g. Distributed Systems)"
 placeholderTextColor="#6B7280"
 className="bg-light p-4 rounded-xl text-light-text mb-4 border border-light-border"
 value={newSubject.name}
 onChangeText={(t) => setNewSubject({ ...newSubject, name: t })}
 />
 <TextInput
 placeholder="Subject Code (e.g. CS402)"
 placeholderTextColor="#6B7280"
 className="bg-light p-4 rounded-xl text-light-text mb-6 border border-light-border"
 value={newSubject.code}
 onChangeText={(t) => setNewSubject({ ...newSubject, code: t })}
 autoCapitalize="characters"
 />
 <Text className="text-light-muted font-bold mb-3 ml-1">Subject Type</Text>
 <View className="flex-row bg-light p-1 rounded-2xl mb-8 border border-light-border">
 <TouchableOpacity 
 key="theory"
 onPress={() => setNewSubject({ ...newSubject, type: 'theory' })}
 className="flex-1 p-3 rounded-xl items-center"
 style={{ backgroundColor: newSubject.type === 'theory' ? '#6366F1' : 'transparent' }}
 >
 <Text 
 className="font-bold" 
 style={{ color: newSubject.type === 'theory' ? '#FFFFFF' : '#6B7280' }}
 >
 Theory
 </Text>
 </TouchableOpacity>
 <TouchableOpacity 
 key="practical"
 onPress={() => setNewSubject({ ...newSubject, type: 'practical' })}
 className="flex-1 p-3 rounded-xl items-center"
 style={{ backgroundColor: newSubject.type === 'practical' ? '#6366F1' : 'transparent' }}
 >
 <Text 
 className="font-bold" 
 style={{ color: newSubject.type === 'practical' ? '#FFFFFF' : '#6B7280' }}
 >
 Practical
 </Text>
 </TouchableOpacity>
 </View>
 <View className="flex-row">
 <TouchableOpacity 
 onPress={onClose}
 className="flex-1 items-center p-4"
 disabled={loading}
 >
 <Text className="text-light-muted font-bold">Cancel</Text>
 </TouchableOpacity>
 <Button 
 title="Create" 
 onPress={handleCreate} 
 className="flex-1" 
 loading={loading}
 />
 </View>
 </View>
 </View>
 </Modal>
 );
});
