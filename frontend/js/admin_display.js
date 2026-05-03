/**
 * admin_display.js
 * Logic for the public queue display board.
 */

document.addEventListener('DOMContentLoaded', () => {
  const displayTime = document.getElementById('displayTime');
  const servingList = document.getElementById('servingList');
  const waitingList = document.getElementById('waitingList');

  let previousServing = [];
  let previousWaiting = [];

  // Update clock every second
  function updateClock() {
    const now = new Date();
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    displayTime.textContent = `${hours}:${minutes}`;
  }

  // Fetch and update queue data
  async function fetchQueueData() {
    try {
      const res = await fetch('/queue/get');
      if (!res.ok) {
        if (res.status === 401) {
          window.location.href = '/admin/login';
          return;
        }
        throw new Error('Failed to fetch queue data');
      }

      const data = await res.json();
      
      const serving = data.filter(item => item.status === 'serving').map(i => i.queue_number);
      const waiting = data.filter(item => item.status === 'waiting').map(i => i.queue_number);

      // Sort numbers in ascending order
      serving.sort((a, b) => a - b);
      waiting.sort((a, b) => a - b);

      renderList(servingList, serving, previousServing, 'No one currently serving');
      renderList(waitingList, waiting, previousWaiting, 'No one waiting');

      previousServing = serving;
      previousWaiting = waiting;

    } catch (err) {
      console.error('Error fetching queue:', err);
    }
  }

  function renderList(container, currentItems, previousItems, emptyMessage) {
    // Check if the array has changed to avoid unnecessary DOM updates and re-triggering animations
    if (JSON.stringify(currentItems) === JSON.stringify(previousItems) && previousItems.length !== 0) {
      return;
    }

    container.innerHTML = ''; // Clear container

    if (currentItems.length === 0) {
      const emptyDiv = document.createElement('div');
      emptyDiv.className = 'empty-state';
      emptyDiv.textContent = emptyMessage;
      container.appendChild(emptyDiv);
      return;
    }

    currentItems.forEach(num => {
      const ticketDiv = document.createElement('div');
      ticketDiv.className = 'ticket';
      // Format to 3 digits e.g. 001
      ticketDiv.textContent = String(num).padStart(3, '0');
      container.appendChild(ticketDiv);
    });
  }

  // Initial calls
  updateClock();
  fetchQueueData();

  // Set intervals
  setInterval(updateClock, 1000); // 1s
  setInterval(fetchQueueData, 15000); // 15s
});
