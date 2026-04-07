import csv
import random
import math

def generate_moons(n_samples=500, noise=0.1):
    data = []
    for _ in range(n_samples // 2):
        # Outer moon
        angle = random.uniform(0, math.pi)
        x = math.cos(angle) + random.gauss(0, noise)
        y = math.sin(angle) + random.gauss(0, noise)
        data.append((x, y, 0))
        
        # Inner moon
        angle = random.uniform(0, math.pi)
        x = 1 - math.cos(angle) + random.gauss(0, noise)
        y = 1 - math.sin(angle) - 0.5 + random.gauss(0, noise)
        data.append((x, y, 1))
        
    random.shuffle(data)
    
    with open('test_data_moons.csv', 'w', newline='') as f:
        writer = csv.writer(f)
        writer.writerow(['feature_1', 'feature_2', 'label'])
        for row in data:
            writer.writerow(row)

if __name__ == "__main__":
    generate_moons()
    print("Generated test_data_moons.csv")
