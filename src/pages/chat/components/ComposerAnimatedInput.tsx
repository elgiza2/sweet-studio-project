import { useEffect, useRef } from "react";
import { ComposerPrimitive, useComposerRuntime } from "@assistant-ui/react";
import AnimatedInput from "@/components/chat/AnimatedInput";
import type { AgentDef, AgentModel } from "@/lib/agentRegistry";
import type { ChatMode } from "../chatConstants";
import { ComposerInlineSlot } from "./ComposerInlineSlot";


interface ComposerAnimatedInputProps {
  // Input state
  input: string;
  setInput: (v: string) => void;
  handleSend: () => unknown | Promise<unknown>;
  handleCancel: () => void;
  // Plus menu
  plusMenuOpen: boolean;
  setPlusMenuOpen: (v: boolean) => void;
  setPlusView: (v: any) => void;
  // Loading/disabled
  isLoading: boolean;
  remoteAiBusy: unknown;
  activeResearchJobId: string | null;
  // Questions
  pendingQuestions: any;
  handleQuestionAnswer: (...args: any[]) => void;
  handleQuestionSkip: (...args: any[]) => void;
  // Agent / model
  chatMode: ChatMode;
  setChatMode: (m: ChatMode) => void;
  selectedAgent: AgentDef | null;
  setSelectedAgent: (a: AgentDef | null) => void;
  selectedModel: any;
  setSelectedModel: (m: any) => void;
  setSearchEnabled: (v: boolean) => void;
  handleModeChange: (m: ChatMode) => void;
  tryActivateMegsyOs: () => void;
  // Editing
  editingIndex: number | null;
  cancelEdit: () => void;
  // ComposerInlineSlot
  isMobileViewport: boolean;
  tierMenuOpen: boolean;
  setTierMenuOpen: (v: boolean) => void;
  megsyTier: any;
  setMegsyTier: (t: any) => void;
  userPlan: string | null | undefined;
  mediaModel: any;
  setMediaModel: (m: any) => void;
  chatUserId: string | null;
  slidesTemplate: any;
  setSlidesPickerOpen: (v: boolean) => void;
  researchDepth: any;
  setResearchDepth: (v: any) => void;
  researchDepthOpen: boolean;
  setResearchDepthOpen: (v: boolean) => void;
  /** Whether the composer is rendered inside the chat page (vs. landing/preview). */
  chatContext?: boolean;
  onInputFocusChange?: (focused: boolean) => void;
}

/**
 * جسر مزامنة بين نص الإدخال المحلي (`input`) و composer الخاص بـ runtime
 * assistant-ui. يسمح لأي primitive (Send / Quote / SelectionToolbar) بقراءة
 * وكتابة النص عبر الـ runtime بدون تغيير مصدر الحقيقة الفعلي.
 */
function ComposerTextSync({
  input,
  setInput,
}: {
  input: string;
  setInput: (v: string) => void;
}) {
  const composer = useComposerRuntime();
  const inputRef = useRef(input);
  inputRef.current = input;
  const setInputRef = useRef(setInput);
  setInputRef.current = setInput;
  // آخر نص دفعناه للـ runtime — يمنع ارتداد نفس القيمة إلينا (حلقة لا نهائية
  // كانت تسبب "Maximum update depth exceeded" وابتلاع حروف أثناء الكتابة).
  const lastPushed = useRef<string | null>(null);

  // local → runtime
  useEffect(() => {
    const state = composer.getState();
    if (state.text !== input) {
      lastPushed.current = input;
      composer.setText(input);
    }
  }, [composer, input]);

  // runtime → local (يلتقط setText الخارجي من Quote/SelectionToolbar فقط)
  useEffect(() => {
    return composer.subscribe(() => {
      const text = composer.getState().text;
      if (text === lastPushed.current) return; // صدى دفعتنا نحن
      if (text !== inputRef.current) {
        lastPushed.current = text;
        setInputRef.current(text);
      }
    });
  }, [composer]);


  return null;
}

/** Modes whose indicator is owned by ComposerServicePanel. */
const PANEL_MODES = new Set<string>([
  "images",
  "video",
  "slides",
  "slides-images",
  "music",
  "code",
  "deep-research",
  "learning",
  "docs",
]);

export function ComposerAnimatedInput(props: ComposerAnimatedInputProps) {
  const {
    input,
    setInput,
    handleSend,
    handleCancel,
    plusMenuOpen,
    setPlusMenuOpen,
    setPlusView,
    isLoading,
    remoteAiBusy,
    activeResearchJobId,
    pendingQuestions,
    handleQuestionAnswer,
    handleQuestionSkip,
    chatMode,
    setChatMode,
    selectedAgent,
    setSelectedAgent,
    selectedModel,
    setSelectedModel,
    setSearchEnabled,
    handleModeChange,
    tryActivateMegsyOs,
    editingIndex,
    cancelEdit,
    chatContext,
    onInputFocusChange,
    ...inlineSlotProps
  } = props;

  return (
    <>
      <ComposerTextSync input={input} setInput={setInput} />
      <ComposerPrimitive.Root asChild>
        <AnimatedInput
          value={input}


        onChange={setInput}
      onSend={handleSend as any}
      onCancel={handleCancel}
      onPlusClick={() => {
        if (!plusMenuOpen) setPlusView("main");
        setPlusMenuOpen(!plusMenuOpen);
      }}
      disabled={isLoading || !!remoteAiBusy || !!activeResearchJobId}
      isLoading={isLoading || !!activeResearchJobId}
      pendingQuestions={pendingQuestions}
      onQuestionAnswer={handleQuestionAnswer}
      onQuestionSkip={handleQuestionSkip}
      activeAgent={
        // Modes that render the labelled ComposerServicePanel header must NOT
        // also render an agent pill — that is what produced two chips at once.
        chatMode !== "normal"
          ? PANEL_MODES.has(chatMode)
            ? null
            : chatMode
          : selectedAgent?.id === "docs"
            ? null
            : selectedAgent?.id || null
      }
      activeAgentDef={selectedAgent?.id === "docs" ? null : selectedAgent || null}
      onAgentSelect={(agent: AgentDef) => {
        if (agent.id === "operator") {
          tryActivateMegsyOs();
          return;
        }
        const modeMap: Record<string, ChatMode> = {
          learning: "learning",
          shopping: "shopping",
          "deep-research": "deep-research",
          operator: "operator",
        };
        if (modeMap[agent.id]) {
          setSelectedAgent(null);
          setSelectedModel(null);
          handleModeChange(modeMap[agent.id]);
          return;
        }
        setChatMode("normal");
        setSelectedAgent(agent);
        setSelectedModel(null);
      }}
      onAgentRemove={() => {
        setChatMode("normal");
        setSelectedAgent(null);
        setSelectedModel(null);
        if (chatMode === "deep-research") setSearchEnabled(false);
      }}
      selectedModel={selectedModel}
      onModelSelect={(model: AgentModel) => setSelectedModel(model)}
      onModelRemove={() => setSelectedModel(null)}
      accentMode={chatMode === "learning" ? "learn" : null}
      isEditing={editingIndex !== null}
      onCancelEdit={cancelEdit}
      chatContext={chatContext}
      forceEnterToSend={chatMode === "code"}
      onFocusChange={onInputFocusChange}
      inlineSlot={
        <ComposerInlineSlot
          {...inlineSlotProps}
          chatMode={chatMode}
          setChatMode={setChatMode}
          selectedAgent={selectedAgent}
          selectedModel={selectedModel}
          setSelectedModel={setSelectedModel}
        />
      }
      headerSlot={(props as any).activeServiceHeader ?? null}
      activeServiceSlot={(props as any).activeServiceSlot ?? null}
        />
      </ComposerPrimitive.Root>
    </>
  );
}

