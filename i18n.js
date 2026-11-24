/* Orion AI — 多语言文案表 */
var LANGS = [
  { code: 'zh', name: '简体中文' },
  { code: 'zh-TW', name: '繁體中文' },
  { code: 'en', name: 'English' },
  { code: 'ja', name: '日本語' },
  { code: 'ko', name: '한국어' },
  { code: 'ru', name: 'Русский' },
  { code: 'ar', name: 'العربية' },
];

var I18N = {
  zh: {
    'nav.newChat': '新对话', 'nav.newTask': '新工作任务', 'nav.projects': '项目', 'nav.recent': '最近',
    'side.search': '搜索对话', 'side.theme': '切换深浅色', 'side.settings': '系统设置',
    'ms.selected': '已选 {n} 项', 'ms.del': '删除', 'ms.cancel': '取消',
    'conv.today': '今天', 'conv.yesterday': '昨天', 'conv.last7': '最近 7 天',
    'conv.month': '{m} 月', 'conv.year': '{y} 年 {m} 月',
    'conv.empty': '还没有对话，点上面开一个', 'conv.nomatch': '没有匹配的对话',
    'work.title': '工作任务', 'work.sub': '本机代理在工作区里执行：读文件、跑命令、整理桌面，每一步都能看到',
    'work.defaultWs': '默认工作区', 'work.standard': '标准模式',
    'work.goal': '描述任务目标，例如：把桌面截图按日期重命名，归档到工作区',
    'work.area': '工作区', 'work.start': '开始执行',
    'work.all': '全部', 'work.running': '进行中', 'work.done': '已完成', 'work.clearDone': '清除已完成',
    'work.none': '还没有任务，上面写个目标就能开工',
    'hero.hi1': '夜深了，我是 Orion AI！', 'hero.hi2': '早上好，我是 Orion AI！', 'hero.hi3': '上午好，我是 Orion AI！',
    'hero.hi4': '中午好，我是 Orion AI！', 'hero.hi5': '下午好，我是 Orion AI！', 'hero.hi6': '晚上好，我是 Orion AI！',
    'comp.ph': '给 Orion AI 发送消息', 'comp.think': '深度思考', 'comp.web': '联网搜索',
    'comp.attach': '上传图片或文件', 'comp.voice': '语音输入', 'comp.send': '发送', 'comp.stop': '停止生成',
    'comp.model': '切换模型', 'comp.thinkTip': '用思考模型回答', 'comp.webTip': '联网搜索后再回答',
    'foot.ai': '内容由 AI 生成，请仔细甄别',
    'src.title': '搜索结果', 'src.count': '共 {n} 条来源', 'src.found': '搜索到 {n} 个网页',
    'wctl.min': '最小化', 'wctl.max': '最大化', 'wctl.close': '关闭',
    'dlg.title': '系统设置', 'dlg.token': '接口与权益', 'dlg.general': '通用', 'dlg.release': '更新说明', 'dlg.terms': '用户协议',
    'gen.language': '语言', 'gen.theme': '主题', 'gen.model': '默认模型',
    'clear.chat': '清空当前对话',
  },
  'zh-TW': {
    'nav.newChat': '新對話', 'nav.newTask': '新工作任務', 'nav.projects': '專案', 'nav.recent': '最近',
    'side.search': '搜尋對話', 'side.theme': '切換深淺色', 'side.settings': '系統設定',
    'ms.selected': '已選 {n} 項', 'ms.del': '刪除', 'ms.cancel': '取消',
    'conv.today': '今天', 'conv.yesterday': '昨天', 'conv.last7': '最近 7 天',
    'conv.month': '{m} 月', 'conv.year': '{y} 年 {m} 月',
    'conv.empty': '還沒有對話，點上面開一個', 'conv.nomatch': '沒有符合的對話',
    'work.title': '工作任務', 'work.sub': '本機代理在工作區裡執行：讀檔案、跑指令、整理桌面，每一步都看得見',
    'work.defaultWs': '預設工作區', 'work.standard': '標準模式',
    'work.goal': '描述任務目標，例如：把桌面截圖按日期重新命名，歸檔到工作區',
    'work.area': '工作區', 'work.start': '開始執行',
    'work.all': '全部', 'work.running': '進行中', 'work.done': '已完成', 'work.clearDone': '清除已完成',
    'work.none': '還沒有任務，上面寫個目標就能開工',
    'hero.hi1': '夜深了，我是 Orion AI！', 'hero.hi2': '早安，我是 Orion AI！', 'hero.hi3': '上午好，我是 Orion AI！',
    'hero.hi4': '中午好，我是 Orion AI！', 'hero.hi5': '下午好，我是 Orion AI！', 'hero.hi6': '晚上好，我是 Orion AI！',
    'comp.ph': '傳訊息給 Orion AI', 'comp.think': '深度思考', 'comp.web': '聯網搜尋',
    'comp.attach': '上傳圖片或檔案', 'comp.voice': '語音輸入', 'comp.send': '傳送', 'comp.stop': '停止生成',
    'comp.model': '切換模型', 'comp.thinkTip': '用思考模型回答', 'comp.webTip': '聯網搜尋後再回答',
    'foot.ai': '內容由 AI 生成，請仔細甄別',
    'src.title': '搜尋結果', 'src.count': '共 {n} 條來源', 'src.found': '搜尋到 {n} 個網頁',
    'wctl.min': '最小化', 'wctl.max': '最大化', 'wctl.close': '關閉',
    'dlg.title': '系統設定', 'dlg.token': '介面與權益', 'dlg.general': '一般', 'dlg.release': '更新說明', 'dlg.terms': '使用者條款',
    'gen.language': '語言', 'gen.theme': '主題', 'gen.model': '預設模型',
    'clear.chat': '清空目前對話',
  },
  en: {
    'nav.newChat': 'New chat', 'nav.newTask': 'New task', 'nav.projects': 'Project', 'nav.recent': 'Recent',
    'side.search': 'Search chats', 'side.theme': 'Toggle theme', 'side.settings': 'Settings',
    'ms.selected': '{n} selected', 'ms.del': 'Delete', 'ms.cancel': 'Cancel',
    'conv.today': 'Today', 'conv.yesterday': 'Yesterday', 'conv.last7': 'Last 7 days',
    'conv.month': '{m}', 'conv.year': '{y} · {m}',
    'conv.empty': 'No chats yet — start one above', 'conv.nomatch': 'No matching chats',
    'work.title': 'Work task', 'work.sub': 'The local agent works inside your workspace: read files, run commands, tidy folders — every step visible.',
    'work.defaultWs': 'Default workspace', 'work.standard': 'Standard mode',
    'work.goal': 'Describe the goal, e.g. rename desktop screenshots by date and move them into the workspace',
    'work.area': 'Workspace', 'work.start': 'Run',
    'work.all': 'All', 'work.running': 'Running', 'work.done': 'Done', 'work.clearDone': 'Clear finished',
    'work.none': 'No tasks yet — write a goal above to begin',
    'hero.hi1': 'Late night — I am Orion AI!', 'hero.hi2': 'Good morning — I am Orion AI!', 'hero.hi3': 'Good morning — I am Orion AI!',
    'hero.hi4': 'Good noon — I am Orion AI!', 'hero.hi5': 'Good afternoon — I am Orion AI!', 'hero.hi6': 'Good evening — I am Orion AI!',
    'comp.ph': 'Message Orion AI', 'comp.think': 'Deep think', 'comp.web': 'Web search',
    'comp.attach': 'Attach image or file', 'comp.voice': 'Voice input', 'comp.send': 'Send', 'comp.stop': 'Stop',
    'comp.model': 'Switch model', 'comp.thinkTip': 'Answer with the reasoning model', 'comp.webTip': 'Search the web first',
    'foot.ai': 'Content is AI-generated. Please verify important details.',
    'src.title': 'Search results', 'src.count': '{n} sources', 'src.found': 'Found {n} web pages',
    'wctl.min': 'Minimize', 'wctl.max': 'Maximize', 'wctl.close': 'Close',
    'dlg.title': 'Settings', 'dlg.token': 'API & balance', 'dlg.general': 'General', 'dlg.release': 'Release notes', 'dlg.terms': 'Terms',
    'gen.language': 'Language', 'gen.theme': 'Theme', 'gen.model': 'Default model',
    'clear.chat': 'Clear this chat',
  },
  ja: {
    'nav.newChat': '新しいチャット', 'nav.newTask': '新しいタスク', 'nav.projects': 'プロジェクト', 'nav.recent': '最近',
    'side.search': 'チャットを検索', 'side.theme': 'テーマ切替', 'side.settings': '設定',
    'ms.selected': '{n} 件選択', 'ms.del': '削除', 'ms.cancel': 'キャンセル',
    'conv.today': '今日', 'conv.yesterday': '昨日', 'conv.last7': '過去 7 日',
    'conv.month': '{m}月', 'conv.year': '{y}年{m}月',
    'conv.empty': 'チャットはまだありません。上から開始してください', 'conv.nomatch': '一致するチャットがありません',
    'work.title': 'ワークタスク', 'work.sub': 'ローカルエージェントがワークスペース内で実行します。ファイル読み取り、コマンド実行、整理まで、各手順が見えます。',
    'work.defaultWs': '既定のワークスペース', 'work.standard': '標準モード',
    'work.goal': '目標を入力（例：デスクトップのスクショを日付順にリネームしてワークスペースへ移動）',
    'work.area': 'ワークスペース', 'work.start': '実行',
    'work.all': 'すべて', 'work.running': '実行中', 'work.done': '完了', 'work.clearDone': '完了分を消去',
    'work.none': 'タスクはまだありません。上に目標を書けば開始できます',
    'hero.hi1': '夜更かしですね。Orion AI です！', 'hero.hi2': 'おはようございます。Orion AI です！', 'hero.hi3': 'おはようございます。Orion AI です！',
    'hero.hi4': 'こんにちは。Orion AI です！', 'hero.hi5': 'こんにちは。Orion AI です！', 'hero.hi6': 'こんばんは。Orion AI です！',
    'comp.ph': 'Orion AI にメッセージ', 'comp.think': '深く考える', 'comp.web': 'ウェブ検索',
    'comp.attach': '画像やファイルを添付', 'comp.voice': '音声入力', 'comp.send': '送信', 'comp.stop': '停止',
    'comp.model': 'モデル切替', 'comp.thinkTip': '思考モデルで回答', 'comp.webTip': '先にウェブ検索する',
    'foot.ai': '内容は AI が生成しています。重要な情報はご確認ください。',
    'src.title': '検索結果', 'src.count': '{n} 件のソース', 'src.found': '{n} 件のウェブページが見つかりました',
    'wctl.min': '最小化', 'wctl.max': '最大化', 'wctl.close': '閉じる',
    'dlg.title': '設定', 'dlg.token': 'API と残高', 'dlg.general': '一般', 'dlg.release': '更新情報', 'dlg.terms': '利用規約',
    'gen.language': '言語', 'gen.theme': 'テーマ', 'gen.model': '既定のモデル',
    'clear.chat': 'このチャットを消去',
  },
  ko: {
    'nav.newChat': '새 채팅', 'nav.newTask': '새 작업', 'nav.projects': '프로젝트', 'nav.recent': '최근',
    'side.search': '채팅 검색', 'side.theme': '테마 전환', 'side.settings': '설정',
    'ms.selected': '{n}개 선택됨', 'ms.del': '삭제', 'ms.cancel': '취소',
    'conv.today': '오늘', 'conv.yesterday': '어제', 'conv.last7': '최근 7일',
    'conv.month': '{m}월', 'conv.year': '{y}년 {m}월',
    'conv.empty': '아직 채팅이 없습니다. 위에서 시작하세요', 'conv.nomatch': '일치하는 채팅이 없습니다',
    'work.title': '작업', 'work.sub': '로컬 에이전트가 워크스페이스에서 실행합니다. 파일 읽기, 명령 실행, 정리까지 모든 단계가 보입니다.',
    'work.defaultWs': '기본 워크스페이스', 'work.standard': '표준 모드',
    'work.goal': '목표를 입력하세요 (예: 바탕화면 스크린샷을 날짜별로 이름 바꿔 워크스페이스로 정리)',
    'work.area': '워크스페이스', 'work.start': '실행',
    'work.all': '전체', 'work.running': '진행 중', 'work.done': '완료', 'work.clearDone': '완료 항목 지우기',
    'work.none': '아직 작업이 없습니다. 위에 목표를 적으면 시작됩니다',
    'hero.hi1': '늦은 시간이네요. Orion AI입니다!', 'hero.hi2': '좋은 아침입니다. Orion AI입니다!', 'hero.hi3': '좋은 아침입니다. Orion AI입니다!',
    'hero.hi4': '점심 시간입니다. Orion AI입니다!', 'hero.hi5': '좋은 오후입니다. Orion AI입니다!', 'hero.hi6': '좋은 저녁입니다. Orion AI입니다!',
    'comp.ph': 'Orion AI에게 메시지 보내기', 'comp.think': '심층 사고', 'comp.web': '웹 검색',
    'comp.attach': '이미지 또는 파일 첨부', 'comp.voice': '음성 입력', 'comp.send': '보내기', 'comp.stop': '중지',
    'comp.model': '모델 전환', 'comp.thinkTip': '사고 모델로 답변', 'comp.webTip': '먼저 웹 검색',
    'foot.ai': 'AI가 생성한 내용입니다. 중요한 정보는 확인하세요.',
    'src.title': '검색 결과', 'src.count': '출처 {n}개', 'src.found': '웹페이지 {n}개를 찾았습니다',
    'wctl.min': '최소화', 'wctl.max': '최대화', 'wctl.close': '닫기',
    'dlg.title': '설정', 'dlg.token': 'API 및 잔액', 'dlg.general': '일반', 'dlg.release': '업데이트 내역', 'dlg.terms': '이용약관',
    'gen.language': '언어', 'gen.theme': '테마', 'gen.model': '기본 모델',
    'clear.chat': '이 채팅 비우기',
  },
  ru: {
    'nav.newChat': 'Новый чат', 'nav.newTask': 'Новая задача', 'nav.projects': 'Проект', 'nav.recent': 'Недавние',
    'side.search': 'Поиск чатов', 'side.theme': 'Сменить тему', 'side.settings': 'Настройки',
    'ms.selected': 'Выбрано: {n}', 'ms.del': 'Удалить', 'ms.cancel': 'Отмена',
    'conv.today': 'Сегодня', 'conv.yesterday': 'Вчера', 'conv.last7': 'Последние 7 дней',
    'conv.month': '{m}', 'conv.year': '{y} · {m}',
    'conv.empty': 'Чатов пока нет — начните сверху', 'conv.nomatch': 'Нет подходящих чатов',
    'work.title': 'Задача', 'work.sub': 'Локальный агент работает в рабочей папке: читает файлы, запускает команды, наводит порядок — каждый шаг виден.',
    'work.defaultWs': 'Рабочая папка по умолчанию', 'work.standard': 'Стандартный режим',
    'work.goal': 'Опишите цель, например: переименовать скриншоты по датам и сложить в рабочую папку',
    'work.area': 'Рабочая папка', 'work.start': 'Запустить',
    'work.all': 'Все', 'work.running': 'В работе', 'work.done': 'Готово', 'work.clearDone': 'Очистить готовые',
    'work.none': 'Задач пока нет — напишите цель выше',
    'hero.hi1': 'Поздний вечер. Я Orion AI!', 'hero.hi2': 'Доброе утро. Я Orion AI!', 'hero.hi3': 'Доброе утро. Я Orion AI!',
    'hero.hi4': 'Добрый день. Я Orion AI!', 'hero.hi5': 'Добрый день. Я Orion AI!', 'hero.hi6': 'Добрый вечер. Я Orion AI!',
    'comp.ph': 'Сообщение для Orion AI', 'comp.think': 'Глубокий анализ', 'comp.web': 'Веб-поиск',
    'comp.attach': 'Прикрепить изображение или файл', 'comp.voice': 'Голосовой ввод', 'comp.send': 'Отправить', 'comp.stop': 'Стоп',
    'comp.model': 'Сменить модель', 'comp.thinkTip': 'Ответ с моделью рассуждений', 'comp.webTip': 'Сначала поиск в сети',
    'foot.ai': 'Ответ создан ИИ. Проверяйте важную информацию.',
    'src.title': 'Результаты поиска', 'src.count': 'Источников: {n}', 'src.found': 'Найдено страниц: {n}',
    'wctl.min': 'Свернуть', 'wctl.max': 'Развернуть', 'wctl.close': 'Закрыть',
    'dlg.title': 'Настройки', 'dlg.token': 'API и баланс', 'dlg.general': 'Общие', 'dlg.release': 'Обновления', 'dlg.terms': 'Условия',
    'gen.language': 'Язык', 'gen.theme': 'Тема', 'gen.model': 'Модель по умолчанию',
    'clear.chat': 'Очистить текущий чат',
  },
  ar: {
    'nav.newChat': 'محادثة جديدة', 'nav.newTask': 'مهمة جديدة', 'nav.projects': 'المشروع', 'nav.recent': 'الأحدث',
    'side.search': 'بحث في المحادثات', 'side.theme': 'تبديل المظهر', 'side.settings': 'الإعدادات',
    'ms.selected': 'تم تحديد {n}', 'ms.del': 'حذف', 'ms.cancel': 'إلغاء',
    'conv.today': 'اليوم', 'conv.yesterday': 'أمس', 'conv.last7': 'آخر ٧ أيام',
    'conv.month': '{m}', 'conv.year': '{y} · {m}',
    'conv.empty': 'لا توجد محادثات — ابدأ واحدة من الأعلى', 'conv.nomatch': 'لا محادثات مطابقة',
    'work.title': 'مهمة عمل', 'work.sub': 'ينفّذ الوكيل المحلي داخل مجلد العمل: قراءة الملفات، تشغيل الأوامر، ترتيب المجلدات — كل خطوة مرئية.',
    'work.defaultWs': 'مجلد العمل الافتراضي', 'work.standard': 'الوضع القياسي',
    'work.goal': 'اكتب الهدف، مثال: إعادة تسمية صور سطح المكتب بالتاريخ ونقلها إلى مجلد العمل',
    'work.area': 'مجلد العمل', 'work.start': 'تشغيل',
    'work.all': 'الكل', 'work.running': 'قيد التنفيذ', 'work.done': 'منجز', 'work.clearDone': 'مسح المنجزة',
    'work.none': 'لا مهام بعد — اكتب هدفًا في الأعلى للبدء',
    'hero.hi1': 'وقت متأخر — أنا Orion AI!', 'hero.hi2': 'صباح الخير — أنا Orion AI!', 'hero.hi3': 'صباح الخير — أنا Orion AI!',
    'hero.hi4': 'طاب يومك — أنا Orion AI!', 'hero.hi5': 'مساء الخير — أنا Orion AI!', 'hero.hi6': 'مساء الخير — أنا Orion AI!',
    'comp.ph': 'أرسل رسالة إلى Orion AI', 'comp.think': 'تفكير عميق', 'comp.web': 'بحث في الويب',
    'comp.attach': 'إرفاق صورة أو ملف', 'comp.voice': 'إدخال صوتي', 'comp.send': 'إرسال', 'comp.stop': 'إيقاف',
    'comp.model': 'تبديل النموذج', 'comp.thinkTip': 'الإجابة بنموذج التفكير', 'comp.webTip': 'ابحث في الويب أولًا',
    'foot.ai': 'المحتوى من إنشاء الذكاء الاصطناعي، تحقّق من المعلومات المهمة.',
    'src.title': 'نتائج البحث', 'src.count': 'عدد المصادر: {n}', 'src.found': 'تم العثور على {n} صفحة',
    'wctl.min': 'تصغير', 'wctl.max': 'تكبير', 'wctl.close': 'إغلاق',
    'dlg.title': 'الإعدادات', 'dlg.token': 'المفتاح والرصيد', 'dlg.general': 'عام', 'dlg.release': 'ملاحظات الإصدار', 'dlg.terms': 'الشروط',
    'gen.language': 'اللغة', 'gen.theme': 'المظهر', 'gen.model': 'النموذج الافتراضي',
    'clear.chat': 'مسح هذه المحادثة',
  },
};

var LANG = 'zh';

(function () {
  var sub = {
    zh: 'AI 生成可能有误 请核实',
    'zh-TW': 'AI 生成可能有誤 請核實',
    en: 'AI output may be wrong — please verify',
    ja: 'AI の生成内容は誤りを含む場合があります。ご確認ください',
    ko: 'AI 생성 내용은 틀릴 수 있습니다. 확인하세요',
    ru: 'Ответ ИИ может содержать ошибки — проверяйте',
    ar: 'قد يكون ناتج الذكاء الاصطناعي خطأً — يرجى التحقق',
  };
  Object.keys(sub).forEach(function (k) { if (I18N[k]) I18N[k]['chat.sub'] = sub[k]; });

  var more = {
    zh: { 'gen.light': '浅色', 'gen.dark': '深色', 'gen.auto': '跟随系统', 'gen.ctx': '上下文保留' },
    'zh-TW': { 'gen.light': '淺色', 'gen.dark': '深色', 'gen.auto': '跟隨系統', 'gen.ctx': '上下文保留' },
    en: { 'gen.light': 'Light', 'gen.dark': 'Dark', 'gen.auto': 'System', 'gen.ctx': 'Context window' },
    ja: { 'gen.light': 'ライト', 'gen.dark': 'ダーク', 'gen.auto': 'システムに従う', 'gen.ctx': 'コンテキスト保持' },
    ko: { 'gen.light': '라이트', 'gen.dark': '다크', 'gen.auto': '시스템 설정', 'gen.ctx': '컨텍스트 유지' },
    ru: { 'gen.light': 'Светлая', 'gen.dark': 'Тёмная', 'gen.auto': 'Как в системе', 'gen.ctx': 'История контекста' },
    ar: { 'gen.light': 'فاتح', 'gen.dark': 'داكن', 'gen.auto': 'حسب النظام', 'gen.ctx': 'سياق المحادثة' },
  };
  Object.keys(more).forEach(function (k) {
    if (!I18N[k]) return;
    Object.keys(more[k]).forEach(function (key) { I18N[k][key] = more[k][key]; });
  });
})();

function t(key, vars) {
  var d = I18N[LANG] || I18N.zh;
  var s = d[key];
  if (s == null) s = I18N.zh[key];
  if (s == null) return key;
  if (vars) {
    s = s.replace(/\{(\w+)\}/g, function (m, k) { return vars[k] == null ? m : String(vars[k]); });
  }
  return s;
}

function greetKey() {
  var h = new Date().getHours();
  if (h < 5) return 'hero.hi1';
  if (h < 9) return 'hero.hi2';
  if (h < 12) return 'hero.hi3';
  if (h < 14) return 'hero.hi4';
  if (h < 18) return 'hero.hi5';
  if (h < 23) return 'hero.hi6';
  return 'hero.hi1';
}

function applyLang(code) {
  LANG = I18N[code] ? code : 'zh';
  var el = document.documentElement;
  el.lang = LANG === 'zh' ? 'zh-CN' : (LANG === 'zh-TW' ? 'zh-Hant' : LANG);
  el.dir = LANG === 'ar' ? 'rtl' : 'ltr';
  document.querySelectorAll('[data-i18n]').forEach(function (n) {
    n.textContent = t(n.getAttribute('data-i18n'));
  });
  document.querySelectorAll('[data-i18n-ph]').forEach(function (n) {
    n.setAttribute('placeholder', t(n.getAttribute('data-i18n-ph')));
  });
  document.querySelectorAll('[data-i18n-title]').forEach(function (n) {
    n.setAttribute('title', t(n.getAttribute('data-i18n-title')));
  });
  if (window.renderConvs) renderConvs();
  if (window.renderWsPill) renderWsPill();
  if (window.renderTasks) renderTasks();
  if (window.renderWork) renderWork();
  if (typeof renderChat === 'function') renderChat();
  if (window.syncHero) syncHero();
}

function syncHero() {
  var e = document.getElementById('heroSay');
  if (e) e.textContent = t(greetKey());
}
