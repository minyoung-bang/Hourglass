import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert, FlatList, KeyboardAvoidingView, Modal, Platform, Pressable,
  SafeAreaView, ScrollView, StatusBar, StyleSheet, Text, TextInput, View,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import DateTimePicker from '@react-native-community/datetimepicker';

const STORAGE_KEY = 'deadline-gauge.categories.v1';
const COLORS = ['#E84C4C', '#FF8A3D', '#F4C542', '#4DBA78', '#4B8FE2', '#7B61D1', '#E069A8', '#343A40'];

const id = () => `${Date.now()}-${Math.random().toString(16).slice(2)}`;
const clamp = (n) => Math.min(Math.max(n, 0), 1);
const progress = (todo, now) => 1 - clamp((now - new Date(todo.createdAt)) / (new Date(todo.dueDate) - new Date(todo.createdAt)));
const remaining = (todo, now) => {
  if (todo.done) return '완료';
  const seconds = (new Date(todo.dueDate) - now) / 1000;
  if (seconds <= 0) return '기한 지남';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${Math.max(minutes, 1)}분 남음`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}시간 남음`;
  return `${Math.floor(hours / 24)}일 남음`;
};
const dueLabel = (value) => new Intl.DateTimeFormat('ko-KR', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));

function Gauge({ value, color, done = false }) {
  return (
    <View style={[styles.gaugeTrack, { backgroundColor: `${color}22` }]}>
      <View style={[styles.gaugeFill, { width: `${Math.max(value * 100, 2)}%`, backgroundColor: done ? '#32A66B' : color }]} />
    </View>
  );
}

function Sheet({ visible, title, onClose, children }) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView style={styles.modalBackdrop} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        <View style={styles.sheet}>
          <View style={styles.sheetHandle} />
          <View style={styles.sheetHeader}>
            <Text style={styles.sheetTitle}>{title}</Text>
            <Pressable onPress={onClose} hitSlop={12}><Text style={styles.close}>×</Text></Pressable>
          </View>
          {children}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

function CategorySheet({ visible, onClose, onAdd }) {
  const [name, setName] = useState('');
  const [color, setColor] = useState(COLORS[0]);
  useEffect(() => { if (visible) { setName(''); setColor(COLORS[0]); } }, [visible]);
  const submit = () => {
    if (!name.trim()) return;
    onAdd({ id: id(), name: name.trim(), color, todos: [] });
    onClose();
  };
  return (
    <Sheet visible={visible} title="새 카테고리" onClose={onClose}>
      <Text style={styles.label}>카테고리 이름</Text>
      <TextInput value={name} onChangeText={setName} placeholder="예: 과제" style={styles.input} autoFocus maxLength={24} />
      <Text style={styles.label}>색상</Text>
      <View style={styles.palette}>
        {COLORS.map((item) => (
          <Pressable key={item} onPress={() => setColor(item)} style={[styles.swatch, { backgroundColor: item }, color === item && styles.swatchSelected]}>
            {color === item && <Text style={styles.check}>✓</Text>}
          </Pressable>
        ))}
      </View>
      <Pressable disabled={!name.trim()} onPress={submit} style={[styles.primaryButton, { backgroundColor: color }, !name.trim() && styles.disabled]}>
        <Text style={styles.primaryButtonText}>카테고리 추가</Text>
      </Pressable>
    </Sheet>
  );
}

function TodoSheet({ visible, category, onClose, onAdd }) {
  const [title, setTitle] = useState('');
  const [due, setDue] = useState(new Date(Date.now() + 86400000));
  const [pickerMode, setPickerMode] = useState(null);
  useEffect(() => { if (visible) { setTitle(''); setDue(new Date(Date.now() + 86400000)); setPickerMode(null); } }, [visible]);
  if (!category) return null;
  const submit = () => {
    if (!title.trim() || due <= new Date()) return;
    onAdd(category.id, { id: id(), title: title.trim(), createdAt: new Date().toISOString(), dueDate: due.toISOString(), done: false });
    onClose();
  };
  return (
    <Sheet visible={visible} title={`${category.name}에 할 일 추가`} onClose={onClose}>
      <Text style={styles.label}>할 일 이름</Text>
      <TextInput value={title} onChangeText={setTitle} placeholder="예: 수학 과제 제출" style={styles.input} autoFocus maxLength={50} />
      <Text style={styles.label}>기한</Text>
      <View style={styles.dateButtons}>
        <Pressable style={styles.dateButton} onPress={() => setPickerMode('date')}><Text>📅  {due.toLocaleDateString('ko-KR')}</Text></Pressable>
        <Pressable style={styles.dateButton} onPress={() => setPickerMode('time')}><Text>🕐  {due.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}</Text></Pressable>
      </View>
      {pickerMode && <DateTimePicker value={due} mode={pickerMode} minimumDate={new Date()} onChange={(_, value) => { if (value) setDue(value); if (Platform.OS === 'android') setPickerMode(null); }} />}
      <Text style={styles.hint}>게이지는 지금부터 마감까지의 경과 시간을 보여줘요.</Text>
      <Pressable disabled={!title.trim() || due <= new Date()} onPress={submit} style={[styles.primaryButton, { backgroundColor: category.color }, (!title.trim() || due <= new Date()) && styles.disabled]}>
        <Text style={styles.primaryButtonText}>할 일 추가</Text>
      </Pressable>
    </Sheet>
  );
}

function App() {
  const [categories, setCategories] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [tab, setTab] = useState('main');
  const [selected, setSelected] = useState(null);
  const [categoryModal, setCategoryModal] = useState(false);
  const [todoModal, setTodoModal] = useState(false);
  const [now, setNow] = useState(new Date());

  useEffect(() => { AsyncStorage.getItem(STORAGE_KEY).then((raw) => { if (raw) setCategories(JSON.parse(raw)); }).catch(() => {}).finally(() => setLoaded(true)); }, []);
  useEffect(() => { if (loaded) AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(categories)); }, [categories, loaded]);
  useEffect(() => { const timer = setInterval(() => setNow(new Date()), 30000); return () => clearInterval(timer); }, []);

  const current = categories.find((item) => item.id === selected);
  const upcoming = useMemo(() => categories.flatMap((category) => category.todos.filter((todo) => !todo.done).map((todo) => ({ category, todo }))).sort((a, b) => new Date(a.todo.dueDate) - new Date(b.todo.dueDate)), [categories]);
  const updateTodos = (categoryId, change) => setCategories((all) => all.map((category) => category.id === categoryId ? { ...category, todos: change(category.todos) } : category));
  const addTodo = (categoryId, todo) => updateTodos(categoryId, (todos) => [...todos, todo].sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate)));
  const toggleTodo = (categoryId, todoId) => updateTodos(categoryId, (todos) => todos.map((todo) => todo.id === todoId ? { ...todo, done: !todo.done } : todo));
  const deleteTodo = (categoryId, todoId) => Alert.alert('할 일 삭제', '이 할 일을 삭제할까요?', [{ text: '취소' }, { text: '삭제', style: 'destructive', onPress: () => updateTodos(categoryId, (todos) => todos.filter((todo) => todo.id !== todoId)) }]);
  const deleteCategory = (category) => Alert.alert('카테고리 삭제', `'${category.name}'과 안의 모든 할 일을 삭제할까요?`, [{ text: '취소' }, { text: '삭제', style: 'destructive', onPress: () => { setCategories((all) => all.filter((item) => item.id !== category.id)); setSelected(null); } }]);

  const CategoryCard = ({ category }) => {
    const next = category.todos.filter((todo) => !todo.done).sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate))[0];
    return (
      <Pressable onPress={() => setSelected(category.id)} onLongPress={() => deleteCategory(category)} style={styles.card}>
        <View style={styles.row}><View style={[styles.dot, { backgroundColor: category.color }]} /><Text style={styles.cardTitle}>{category.name}</Text><Text style={styles.count}>{category.todos.filter((todo) => !todo.done).length}개</Text><Text style={styles.chevron}>›</Text></View>
        {next ? <><View style={styles.metaRow}><Text numberOfLines={1} style={styles.todoPreview}>{next.title}</Text><Text style={[styles.remaining, new Date(next.dueDate) < now && styles.overdue]}>{remaining(next, now)}</Text></View><Gauge value={progress(next, now)} color={category.color} /></> : <Text style={styles.emptyCard}>할 일을 추가해보세요</Text>}
      </Pressable>
    );
  };

  const Main = () => (
    <View style={styles.screen}>
      <View style={styles.header}><View><Text style={styles.eyebrow}>DEADLINE GAUGE</Text><Text style={styles.title}>남은 시간</Text></View></View>
      {categories.length === 0 ? <View style={styles.empty}><Text style={styles.emptyIcon}>◔</Text><Text style={styles.emptyTitle}>첫 카테고리를 만들어보세요</Text><Text style={styles.emptyBody}>과제, 업무, 운동처럼 할 일을 묶고{`\n`}남은 시간을 한눈에 확인할 수 있어요.</Text><Pressable onPress={() => setCategoryModal(true)} style={styles.blackButton}><Text style={styles.primaryButtonText}>카테고리 추가</Text></Pressable></View> : <FlatList data={categories} keyExtractor={(item) => item.id} renderItem={({ item }) => <CategoryCard category={item} />} contentContainerStyle={styles.list} ListFooterComponent={<Pressable onPress={() => setCategoryModal(true)} style={styles.addCard}><Text style={styles.addCardText}>＋  새 카테고리</Text></Pressable>} />}
    </View>
  );

  const Detail = () => (
    <View style={styles.screen}>
      <View style={styles.detailHeader}><Pressable onPress={() => setSelected(null)} hitSlop={12}><Text style={styles.back}>‹</Text></Pressable><View style={[styles.dot, { backgroundColor: current.color }]} /><Text style={styles.detailTitle}>{current.name}</Text><Pressable onPress={() => deleteCategory(current)}><Text style={styles.delete}>삭제</Text></Pressable></View>
      {current.todos.length === 0 ? <View style={styles.empty}><Text style={styles.emptyIcon}>✓</Text><Text style={styles.emptyTitle}>할 일이 없어요</Text><Text style={styles.emptyBody}>아래 버튼으로 첫 할 일을 추가하세요.</Text></View> : <FlatList data={current.todos} keyExtractor={(item) => item.id} contentContainerStyle={styles.list} renderItem={({ item }) => <Pressable onLongPress={() => deleteTodo(current.id, item.id)} style={styles.todoCard}><View style={styles.todoTop}><Pressable onPress={() => toggleTodo(current.id, item.id)} style={[styles.checkbox, { borderColor: current.color }, item.done && { backgroundColor: current.color }]}>{item.done && <Text style={styles.check}>✓</Text>}</Pressable><View style={styles.todoText}><View style={styles.metaRow}><Text style={[styles.todoTitle, item.done && styles.done]}>{item.title}</Text><Text style={[styles.remaining, new Date(item.dueDate) < now && !item.done && styles.overdue]}>{remaining(item, now)}</Text></View><Gauge value={item.done ? 1 : progress(item, now)} color={current.color} done={item.done} /><Text style={styles.due}>{dueLabel(item.dueDate)}</Text></View></View></Pressable>} />}
      <Pressable onPress={() => setTodoModal(true)} style={[styles.floatingButton, { backgroundColor: current.color }]}><Text style={styles.primaryButtonText}>＋  할 일 추가</Text></Pressable>
    </View>
  );

  const Calendar = () => (
    <View style={styles.screen}><View style={styles.header}><View><Text style={styles.eyebrow}>UPCOMING</Text><Text style={styles.title}>캘린더</Text></View></View>{upcoming.length === 0 ? <View style={styles.empty}><Text style={styles.emptyIcon}>▦</Text><Text style={styles.emptyTitle}>예정된 할 일이 없어요</Text></View> : <FlatList data={upcoming} keyExtractor={(item) => item.todo.id} contentContainerStyle={styles.list} renderItem={({ item }) => <View style={styles.calendarRow}><View style={[styles.dot, { backgroundColor: item.category.color }]} /><View style={styles.todoText}><Text style={styles.todoTitle}>{item.todo.title}</Text><Text style={styles.due}>{item.category.name} · {dueLabel(item.todo.dueDate)}</Text></View><Text style={styles.remaining}>{remaining(item.todo, now)}</Text></View>} />}</View>
  );

  return (
    <SafeAreaView style={styles.safe}><StatusBar barStyle="dark-content" backgroundColor="#F6F5F1" />{selected && current ? <Detail /> : tab === 'main' ? <Main /> : <Calendar />}{!selected && <View style={styles.tabs}><Pressable onPress={() => setTab('main')} style={styles.tab}><Text style={[styles.tabIcon, tab === 'main' && styles.tabActive]}>⌂</Text><Text style={[styles.tabLabel, tab === 'main' && styles.tabActive]}>메인</Text></Pressable><Pressable onPress={() => setTab('calendar')} style={styles.tab}><Text style={[styles.tabIcon, tab === 'calendar' && styles.tabActive]}>▦</Text><Text style={[styles.tabLabel, tab === 'calendar' && styles.tabActive]}>캘린더</Text></Pressable></View>}<CategorySheet visible={categoryModal} onClose={() => setCategoryModal(false)} onAdd={(category) => setCategories((all) => [...all, category])} /><TodoSheet visible={todoModal} category={current} onClose={() => setTodoModal(false)} onAdd={addTodo} /></SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F6F5F1' }, screen: { flex: 1 }, header: { paddingHorizontal: 22, paddingTop: 22, paddingBottom: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }, eyebrow: { fontSize: 11, letterSpacing: 2, color: '#8A8984', fontWeight: '700' }, title: { fontSize: 34, lineHeight: 43, fontWeight: '800', color: '#191918' }, headerPlus: { width: 46, height: 46, borderRadius: 23, backgroundColor: '#191918', alignItems: 'center', justifyContent: 'center' }, headerPlusText: { color: 'white', fontSize: 29, marginTop: -3 }, list: { padding: 16, paddingBottom: 110, gap: 12 }, card: { backgroundColor: 'white', padding: 19, borderRadius: 22, borderWidth: 1, borderColor: '#E7E5DF', gap: 13, shadowColor: '#000', shadowOpacity: .05, shadowRadius: 12, shadowOffset: { width: 0, height: 5 }, elevation: 2 }, row: { flexDirection: 'row', alignItems: 'center', gap: 10 }, dot: { width: 11, height: 11, borderRadius: 6 }, cardTitle: { fontSize: 19, fontWeight: '750', flex: 1, color: '#222' }, count: { color: '#8A8984', fontSize: 13 }, chevron: { color: '#AAA9A4', fontSize: 28, marginLeft: 2 }, metaRow: { flexDirection: 'row', alignItems: 'center', gap: 10 }, todoPreview: { flex: 1, fontSize: 14, color: '#343432', fontWeight: '600' }, remaining: { color: '#777671', fontSize: 12, fontWeight: '700' }, overdue: { color: '#D13C3C' }, gaugeTrack: { height: 11, borderRadius: 8, overflow: 'hidden' }, gaugeFill: { height: '100%', borderRadius: 8 }, emptyCard: { color: '#8A8984' }, addCard: { height: 72, borderRadius: 20, borderWidth: 1.5, borderColor: '#C8C6C0', borderStyle: 'dashed', alignItems: 'center', justifyContent: 'center', marginTop: 2 }, addCardText: { color: '#777671', fontWeight: '700', fontSize: 15 }, empty: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 28, marginBottom: 60 }, emptyIcon: { fontSize: 58, color: '#777671', marginBottom: 13 }, emptyTitle: { fontSize: 20, fontWeight: '800', color: '#272725' }, emptyBody: { color: '#777671', textAlign: 'center', lineHeight: 21, marginTop: 9 }, blackButton: { backgroundColor: '#191918', paddingHorizontal: 22, paddingVertical: 14, borderRadius: 15, marginTop: 22 }, tabs: { height: 76, flexDirection: 'row', borderTopWidth: 1, borderColor: '#E1DFD9', backgroundColor: '#FBFAF7', paddingBottom: 8 }, tab: { flex: 1, alignItems: 'center', justifyContent: 'center' }, tabIcon: { fontSize: 23, color: '#A3A19B' }, tabLabel: { fontSize: 11, fontWeight: '600', color: '#A3A19B', marginTop: 2 }, tabActive: { color: '#191918' }, modalBackdrop: { flex: 1, backgroundColor: '#0006', justifyContent: 'flex-end' }, sheet: { backgroundColor: '#FBFAF7', borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingHorizontal: 22, paddingBottom: 34, minHeight: 390 }, sheetHandle: { width: 42, height: 5, borderRadius: 3, backgroundColor: '#D2D0CA', alignSelf: 'center', marginTop: 9 }, sheetHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 18 }, sheetTitle: { fontSize: 21, fontWeight: '800' }, close: { fontSize: 30, color: '#777671' }, label: { fontSize: 13, fontWeight: '700', color: '#6E6D68', marginBottom: 8, marginTop: 7 }, input: { height: 52, backgroundColor: 'white', borderRadius: 14, borderWidth: 1, borderColor: '#E1DFD9', paddingHorizontal: 15, fontSize: 16, marginBottom: 14 }, palette: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 22 }, swatch: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' }, swatchSelected: { borderWidth: 3, borderColor: 'white', outlineWidth: 2, outlineColor: '#AAA' }, check: { color: 'white', fontWeight: '900' }, primaryButton: { paddingVertical: 16, borderRadius: 15, alignItems: 'center', marginTop: 4 }, primaryButtonText: { color: 'white', fontSize: 16, fontWeight: '800' }, disabled: { opacity: .35 }, dateButtons: { flexDirection: 'row', gap: 10, marginBottom: 10 }, dateButton: { flex: 1, paddingVertical: 15, paddingHorizontal: 10, backgroundColor: 'white', borderWidth: 1, borderColor: '#E1DFD9', borderRadius: 14, alignItems: 'center' }, hint: { color: '#777671', fontSize: 12, marginVertical: 13 }, detailHeader: { height: 72, paddingHorizontal: 18, flexDirection: 'row', alignItems: 'center', gap: 10, borderBottomWidth: 1, borderColor: '#E5E3DE' }, back: { fontSize: 42, color: '#292927', marginTop: -6 }, detailTitle: { fontSize: 23, fontWeight: '800', flex: 1 }, delete: { color: '#D13C3C', fontWeight: '600' }, todoCard: { backgroundColor: 'white', borderRadius: 20, padding: 17, borderWidth: 1, borderColor: '#E7E5DF' }, todoTop: { flexDirection: 'row', gap: 12 }, checkbox: { width: 25, height: 25, borderRadius: 13, borderWidth: 2, alignItems: 'center', justifyContent: 'center' }, todoText: { flex: 1, gap: 8 }, todoTitle: { fontSize: 16, fontWeight: '700', color: '#292927', flex: 1 }, done: { textDecorationLine: 'line-through', color: '#999791' }, due: { fontSize: 12, color: '#8A8984' }, floatingButton: { position: 'absolute', left: 18, right: 18, bottom: 20, borderRadius: 17, paddingVertical: 17, alignItems: 'center', shadowColor: '#000', shadowOpacity: .18, shadowRadius: 8, shadowOffset: { width: 0, height: 3 }, elevation: 4 }, calendarRow: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: 'white', padding: 17, borderRadius: 18, borderWidth: 1, borderColor: '#E7E5DF' },
});

export default App;
