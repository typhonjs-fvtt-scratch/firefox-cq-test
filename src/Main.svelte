<script>
   import { TJSColordPicker } from '@typhonjs-fvtt/svelte-standard/component';

   const options1 = {
      width: 190,
      isPopup: false
   };

   const options2 = {
      width: 80,
      isPopup: false
   };

   let color;
</script>
<div class=content>
   <div class=options>
      <label>Width: <input type=range min=50 max=400 bind:value={options1.width} style="width: 100px"> ({options1.width})</label>
   </div>

   <TJSColordPicker bind:color options={options1} />
   <TJSColordPicker bind:color options={options2} />
   <TJSColordPicker options={options2} />
</div>

<style>
   .content {
      display: flex;
      flex-direction: column;
      padding: 15px;
      gap: 10px;
      background: rgba(255, 255, 255, 0.15);
      border: 2px solid rgba(0, 0, 0, 0.75);

      font-family: Arial, Helvetica, sans-serif;
      user-select: none;

      --tjs-anchor-text-shadow-focus-hover: 0 0 8px pink;
      --tjs-comp-outline-focus-visible: 4px dotted orange;

      --tjs-action-ripple-background: linear-gradient(64.5deg, rgba(245, 116, 185, 1) 40%, rgba(89, 97, 223, 1) 60% );

      --tjs-color-picker-wrapper-background: rgba(0, 0, 0, 0.2);

      --tjs-icon-button-background-hover: rgba(255, 255, 255, 0.05);
      --tjs-icon-button-background-selected: rgba(255, 255, 255, 0.1);
      --tjs-icon-button-diameter: 2em;

      --tjs-input-border: 1px solid #7a7971;
   }

   .content :global(input) {
      border: 1px solid #7a7971;
      border-radius: 3px;
   }

   .options {
      display: flex;
   }
</style>