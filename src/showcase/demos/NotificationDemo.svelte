<script lang="ts">
  import Notification from '../../components/Notification.svelte';
  import TokenMap from '../TokenMap.svelte';
</script>

<div class="demo-block">
  <h2 class="component-title">Notification Components</h2>
  <p class="demo-description">
    Contextual feedback notifications with multiple variants. Import from <code>components/Notification.svelte</code>
  </p>

  <div class="demo-section">
    <h3 class="demo-subtitle">Variants</h3>
    <div class="notification-showcase">
      <Notification
        variant="info"
        title="Information"
        description="This is an informational message to keep you updated."
      />

      <Notification
        variant="success"
        title="Success"
        description="Your action was completed successfully."
      />

      <Notification
        variant="warning"
        title="Warning"
        description="Caution: This action may have unintended consequences."
      />

      <Notification
        variant="danger"
        title="Danger"
        description="Critical error: Please address this issue immediately."
      />
    </div>
  </div>

  <div class="demo-section">
    <h3 class="demo-subtitle">With Impact Text</h3>
    <div class="notification-showcase">
      <Notification
        variant="warning"
        title="Food Shortage"
        description="Your kingdom is running low on food supplies."
        impact="-2 to Economy until resolved"
      />
    </div>
  </div>

  <div class="demo-section">
    <h3 class="demo-subtitle">With Action Button</h3>
    <div class="notification-showcase">
      <Notification
        variant="info"
        title="Settlement Unmapped"
        description="This settlement has not been placed on the map yet."
        actionText="Place on Map"
        actionIcon="fas fa-map-marker-alt"
        onAction={() => {}}
      />

      <Notification
        variant="success"
        title="Trade Agreement Available"
        description="A neighboring faction has offered a trade deal."
        actionText="View Details"
        actionIcon="fas fa-handshake"
        onAction={() => {}}
        actionInline={true}
      />
    </div>
  </div>

  <div class="demo-section">
    <h3 class="demo-subtitle">Compact Size & Emphasis</h3>
    <div class="notification-showcase">
      <Notification
        variant="info"
        title="Compact Notification"
        description="A smaller notification for tighter spaces."
        size="compact"
      />

      <Notification
        variant="danger"
        title="Emphasized Alert"
        description="Important notifications can have emphasis styling."
        emphasis={true}
      />
    </div>
  </div>

  <div class="demo-section">
    <h3 class="demo-subtitle">Dismissible</h3>
    <div class="notification-showcase">
      <Notification
        variant="success"
        title="Dismissible Notification"
        description="Click the X to dismiss this notification."
        dismissible={true}
      />
    </div>
  </div>

  <div class="demo-section">
    <h3 class="demo-subtitle">Tokens</h3>
    <div class="token-sections">
      <TokenMap title="info" tokens={[
        { label: 'Header BG', variable: '--surface-info-low' },
        { label: 'Border', variable: '--border-info' },
        { label: 'Icon', variable: '--text-info' },
      ]} />
      <TokenMap title="success" tokens={[
        { label: 'Header BG', variable: '--surface-success' },
        { label: 'Border', variable: '--border-success' },
        { label: 'Icon', variable: '--text-success' },
      ]} />
      <TokenMap title="warning" tokens={[
        { label: 'Header BG', variable: '--surface-warning' },
        { label: 'Border', variable: '--border-warning' },
        { label: 'Icon', variable: '--text-warning' },
      ]} />
      <TokenMap title="danger" tokens={[
        { label: 'Header BG', variable: '--surface-primary' },
        { label: 'Border', variable: '--border-danger' },
        { label: 'Icon', variable: '--text-danger' },
      ]} />
    </div>
  </div>
</div>

<style>
  @import '../../styles/variables.css';

  .notification-showcase {
    display: flex;
    flex-direction: column;
    gap: var(--space-16);
  }

  .token-sections {
    display: flex;
    flex-direction: column;
    gap: var(--space-16);
  }
</style>
