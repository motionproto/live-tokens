<script lang="ts">
  import Notification from '../../components/Notification.svelte';
  import VariantGroup from '../VariantGroup.svelte';
  import DemoHeader from '../DemoHeader.svelte';

  const targetFile = 'src/components/Notification.svelte';
  const component = 'notification';

  type Token = { label: string; variable: string };

  const variantTokens: Record<string, Token[]> = {
    info: [
      { label: 'surface color', variable: '--notification-info-surface' },
      { label: 'border color', variable: '--notification-info-border' },
      { label: 'icon color', variable: '--notification-info-icon' },
      { label: 'title color', variable: '--notification-info-title' },
      { label: 'title font family', variable: '--notification-info-title-font-family' },
      { label: 'title font weight', variable: '--notification-info-title-font-weight' },
      { label: 'text color', variable: '--notification-info-text' },
      { label: 'radius', variable: '--notification-info-radius' },
    ],
    success: [
      { label: 'surface color', variable: '--notification-success-surface' },
      { label: 'border color', variable: '--notification-success-border' },
      { label: 'icon color', variable: '--notification-success-icon' },
      { label: 'title color', variable: '--notification-success-title' },
      { label: 'title font family', variable: '--notification-success-title-font-family' },
      { label: 'title font weight', variable: '--notification-success-title-font-weight' },
      { label: 'text color', variable: '--notification-success-text' },
      { label: 'radius', variable: '--notification-success-radius' },
    ],
    warning: [
      { label: 'surface color', variable: '--notification-warning-surface' },
      { label: 'border color', variable: '--notification-warning-border' },
      { label: 'icon color', variable: '--notification-warning-icon' },
      { label: 'title color', variable: '--notification-warning-title' },
      { label: 'title font family', variable: '--notification-warning-title-font-family' },
      { label: 'title font weight', variable: '--notification-warning-title-font-weight' },
      { label: 'text color', variable: '--notification-warning-text' },
      { label: 'radius', variable: '--notification-warning-radius' },
    ],
    danger: [
      { label: 'surface color', variable: '--notification-danger-surface' },
      { label: 'border color', variable: '--notification-danger-border' },
      { label: 'icon color', variable: '--notification-danger-icon' },
      { label: 'title color', variable: '--notification-danger-title' },
      { label: 'title font family', variable: '--notification-danger-title-font-family' },
      { label: 'title font weight', variable: '--notification-danger-title-font-weight' },
      { label: 'text color', variable: '--notification-danger-text' },
      { label: 'radius', variable: '--notification-danger-radius' },
    ],
  };
</script>

<div class="demo-block">
  <DemoHeader
    {component}
    title="Notification Components"
    description="Contextual feedback notifications with multiple variants. Import from <code>components/Notification.svelte</code>"
  />

  <VariantGroup name="info" title="Info" tokens={variantTokens.info} {targetFile} {component}>
    <Notification
      variant="info"
      title="Information"
      description="This is an informational message to keep you updated."
    />
  </VariantGroup>

  <VariantGroup name="success" title="Success" tokens={variantTokens.success} {targetFile} {component}>
    <Notification
      variant="success"
      title="Success"
      description="Your action was completed successfully."
    />
  </VariantGroup>

  <VariantGroup name="warning" title="Warning" tokens={variantTokens.warning} {targetFile} {component}>
    <Notification
      variant="warning"
      title="Warning"
      description="Caution: This action may have unintended consequences."
    />
    <Notification
      variant="warning"
      title="Food Shortage"
      description="Your kingdom is running low on food supplies."
      impact="-2 to Economy until resolved"
    />
  </VariantGroup>

  <VariantGroup name="danger" title="Danger" tokens={variantTokens.danger} {targetFile} {component}>
    <Notification
      variant="danger"
      title="Danger"
      description="Critical error: Please address this issue immediately."
    />
    <Notification
      variant="danger"
      title="Emphasized Alert"
      description="Important notifications can have emphasis styling."
      emphasis={true}
    />
  </VariantGroup>
</div>
