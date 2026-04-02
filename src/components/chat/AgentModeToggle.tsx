import { useState } from 'react'
import { ToggleSwitch } from '../ui/ToggleSwitch'
import { useAgentModeStore } from '../../stores/agentModeStore'
import { useChatStore } from '../../stores/chatStore'
import { useModelStore } from '../../stores/modelStore'
import { isAgentCompatible } from '../../lib/model-compatibility'
import { FEATURE_FLAGS } from '../../lib/constants'
import { AgentTutorial } from './AgentTutorial'

export function AgentModeToggle() {
  const [showTutorial, setShowTutorial] = useState(false)
  const activeConversationId = useChatStore((s) => s.activeConversationId)
  const activeModel = useModelStore((s) => s.activeModel)
  const { agentModeActive, toggleAgentMode, tutorialCompleted } = useAgentModeStore()

  if (!FEATURE_FLAGS.AGENT_MODE || !activeConversationId) return null

  const isActive = agentModeActive[activeConversationId] ?? false
  const isCompatible = activeModel ? isAgentCompatible(activeModel) : false

  const handleToggle = () => {
    if (!isCompatible) return
    if (!isActive && !tutorialCompleted) {
      setShowTutorial(true)
      return
    }
    if (activeConversationId) {
      toggleAgentMode(activeConversationId)
    }
  }

  const handleTutorialComplete = () => {
    setShowTutorial(false)
    useAgentModeStore.getState().setTutorialCompleted()
    if (activeConversationId) {
      toggleAgentMode(activeConversationId)
    }
  }

  return (
    <>
      <ToggleSwitch
        enabled={isActive}
        onChange={handleToggle}
        disabled={!isCompatible}
        size="sm"
      />

      {showTutorial && (
        <AgentTutorial
          open={showTutorial}
          onClose={() => setShowTutorial(false)}
          onComplete={handleTutorialComplete}
        />
      )}
    </>
  )
}
