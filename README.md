## The Barnes-Hut simulation

The Barnes-Hut simulation is an algorithm for estimating the forces in an n-body system. While the brute force method is a quintessential example of an **O(n<sup>2</sup>)** algorithm, the Barnes-Hut simulation, using a quadtree (or octree for a 3d simulation), can estimate an n-body system with low error at **O(n\*log(n))**.

The main idea in the estimation is that a group of far away bodies can be approximated using a combined body with the total mass and centre of mass of the system. In the Barnes-Hut simulation this is achieved using a quadtree. Each node of the quadtree can be either: an empty node; a leaf containing one body; or a fork. The fork itself has four nodes corresponding to equally sized quadrants which are themselves a node of some kind. Each fork keeps track of its total mass and centre of mass so if a body is sufficiently distant, forces can be estimated using these values instead of calculating the force for every node

Whether a force calculation will use the combined centre of mass or recursively calculate for the nodes within a fork is dependant the ratio between distance to and size of the fork. If this greater than a chosen value, theta, then the estimation be used and vice versa. Decreasing theta will give a more accurate simulation at the cost of speed and while a greater value will give a less computationally expensive simulation at the cost of accuracy. A theta value of zero will just give the brute force algorithm

## Install and run

```
npm install && npm run build && npm run start
```
